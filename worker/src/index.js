import Stripe from 'stripe';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper to create JSON response
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// Helper to create error response
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

// Supabase REST API helper
async function supabase(env, table, options = {}) {
  const { method = 'GET', query = '', body = null, single = false } = options;

  const headers = {
    'apikey': env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': single ? 'return=representation' : 'return=representation',
  };

  if (single && method === 'GET') {
    headers['Accept'] = 'application/vnd.pgrst.object+json';
  }

  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${error}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// Log activity helper
async function logActivity(env, userId, action, details) {
  await supabase(env, 'activity_log', {
    method: 'POST',
    body: { user_id: userId, action, details },
  });
}

// Plex API helper
async function plexApi(env, endpoint, options = {}) {
  const { method = 'GET', body = null } = options;

  const headers = {
    'X-Plex-Token': env.PLEX_TOKEN,
    'X-Plex-Client-Identifier': 'novix-tv',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  const response = await fetch(`https://plex.tv${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.text();
    throw new Error(`Plex API error: ${error}`);
  }

  if (response.status === 204 || response.status === 200 && response.headers.get('content-length') === '0') {
    return null;
  }

  return response.json();
}

// Delete user from Tautulli - returns { success: boolean, message: string }
async function deleteTautulliUser(env, plexUserId) {
  if (!env.TAUTULLI_URL || !env.TAUTULLI_API_KEY) {
    console.log('Tautulli not configured, skipping user deletion');
    return { success: false, message: 'Tautulli not configured' };
  }

  console.log(`Attempting to delete user ${plexUserId} from Tautulli...`);

  try {
    const url = `${env.TAUTULLI_URL}/api/v2?apikey=${env.TAUTULLI_API_KEY}&cmd=delete_user&user_id=${plexUserId}`;
    const response = await fetch(url);
    const text = await response.text();

    if (response.ok) {
      try {
        const data = JSON.parse(text);
        if (data.response?.result === 'success') {
          console.log(`Successfully deleted user ${plexUserId} from Tautulli`);
          return { success: true, message: 'Removed from Tautulli' };
        } else {
          const msg = data.response?.message || 'Unknown error';
          console.error('Tautulli delete response:', msg);
          return { success: false, message: msg };
        }
      } catch (parseErr) {
        console.error('Tautulli response not JSON:', text.substring(0, 200));
        return { success: false, message: 'Invalid response from Tautulli' };
      }
    } else {
      console.error(`Tautulli API error (${response.status}):`, text.substring(0, 200));
      return { success: false, message: `Tautulli API error: ${response.status}` };
    }
  } catch (err) {
    console.error('Error deleting from Tautulli:', err.message);
    return { success: false, message: err.message };
  }
}

// Remove friend from Plex and revoke server access
async function removePlexFriend(env, plexUserId) {
  // First, remove all library access (set to empty array) so it takes effect immediately
  // This is the same technique used for downgrading - user sees no libraries right away
  try {
    await updatePlexLibraryAccess(env, plexUserId, []);
    console.log(`Removed all library access for user ${plexUserId}`);
  } catch (err) {
    console.error('Error removing library access:', err.message);
  }

  // Now get the shared server ID and delete the share entirely
  try {
    const response = await fetch(`https://plex.tv/api/servers/${env.PLEX_MACHINE_ID}/shared_servers`, {
      headers: {
        'X-Plex-Token': env.PLEX_TOKEN,
        'X-Plex-Client-Identifier': 'novix-tv',
      },
    });

    if (response.ok) {
      const xmlText = await response.text();
      // Parse XML to find the shared server ID for this user
      const sharedServerRegex = new RegExp(`<SharedServer[^>]+id="(\\d+)"[^>]+userID="${plexUserId}"`, 'i');
      let match = xmlText.match(sharedServerRegex);

      if (!match) {
        // Try alternate attribute order
        const altRegex = new RegExp(`<SharedServer[^>]+userID="${plexUserId}"[^>]+id="(\\d+)"`, 'i');
        match = xmlText.match(altRegex);
      }

      if (match) {
        const sharedServerId = match[1];
        // Delete the shared server access via plex.tv
        const deleteResponse = await fetch(`https://plex.tv/api/servers/${env.PLEX_MACHINE_ID}/shared_servers/${sharedServerId}`, {
          method: 'DELETE',
          headers: {
            'X-Plex-Token': env.PLEX_TOKEN,
            'X-Plex-Client-Identifier': 'novix-tv',
          },
        });
        if (deleteResponse.ok || deleteResponse.status === 200) {
          console.log(`Removed shared server access for user ${plexUserId}`);
        } else {
          const errText = await deleteResponse.text();
          console.error(`Failed to delete shared server: ${errText}`);
        }
      } else {
        console.log(`No shared server found for user ${plexUserId}`);
      }
    } else {
      const errText = await response.text();
      console.error(`Failed to get shared servers: ${errText}`);
    }
  } catch (err) {
    console.error('Error removing shared server:', err.message);
  }

  // Remove the friend relationship
  try {
    await plexApi(env, `/api/v2/friends/${plexUserId}`, { method: 'DELETE' });
  } catch (err) {
    console.error('Error removing friend:', err.message);
  }

  // Delete from Tautulli and return result
  const tautulliResult = await deleteTautulliUser(env, plexUserId);
  return { tautulliResult };
}

// Get library keys for a tier (these are the local library keys like 1, 3, 4)
function getLibraryKeysForTier(env, tier) {
  if (tier === 'admin') {
    return JSON.parse(env.LIBRARY_IDS_ADMIN || '[]');
  }
  if (tier === '4k') {
    return JSON.parse(env.LIBRARY_IDS_4K || '[]');
  }
  return JSON.parse(env.LIBRARY_IDS_HD || '[]');
}

// Convert library keys to plex.tv section IDs
// The Plex API requires section IDs (like 139126755), not library keys (like 1)
async function getPlexSectionIds(env, libraryKeys) {
  try {
    // Fetch server info from plex.tv which includes the section ID mapping
    const response = await fetch(`https://plex.tv/api/servers/${env.PLEX_MACHINE_ID}`, {
      headers: {
        'X-Plex-Token': env.PLEX_TOKEN,
        'X-Plex-Client-Identifier': 'novix-tv',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get server info: ${response.status}`);
    }

    const text = await response.text();
    // Parse XML response to extract section mappings
    // Format: <Section id="139126755" key="1" .../>
    const sectionIds = [];
    const sectionRegex = /<Section[^>]+id="(\d+)"[^>]+key="(\d+)"/g;
    let match;
    while ((match = sectionRegex.exec(text)) !== null) {
      const sectionId = parseInt(match[1], 10);
      const key = parseInt(match[2], 10);
      if (libraryKeys.includes(key)) {
        sectionIds.push(sectionId);
      }
    }

    console.log(`Mapped library keys ${JSON.stringify(libraryKeys)} to section IDs ${JSON.stringify(sectionIds)}`);
    return sectionIds;
  } catch (err) {
    console.error('Error getting section IDs:', err.message);
    // Fallback: return the keys as-is (might not work)
    return libraryKeys;
  }
}

// Update user's library access on Plex
// libraryKeys are local library keys (like 1, 3, 4), will be converted to section IDs
async function updatePlexLibraryAccess(env, plexUserId, libraryKeys) {
  try {
    // Convert library keys to plex.tv section IDs
    const sectionIds = await getPlexSectionIds(env, libraryKeys);
    console.log(`Updating access for user ${plexUserId}: keys ${JSON.stringify(libraryKeys)} -> section IDs ${JSON.stringify(sectionIds)}`);

    // Get the shared server for this user from plex.tv (legacy API returns XML)
    const response = await fetch(`https://plex.tv/api/servers/${env.PLEX_MACHINE_ID}/shared_servers`, {
      headers: {
        'X-Plex-Token': env.PLEX_TOKEN,
        'X-Plex-Client-Identifier': 'novix-tv',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to get shared servers: ${errText}`);
    }

    const xmlText = await response.text();
    // Parse XML to find the shared server ID for this user
    // Format: <SharedServer id="12345" ... userID="67890" ...>
    const sharedServerRegex = new RegExp(`<SharedServer[^>]+id="(\\d+)"[^>]+userID="${plexUserId}"`, 'i');
    const match = xmlText.match(sharedServerRegex);

    if (!match) {
      // Try alternate attribute order
      const altRegex = new RegExp(`<SharedServer[^>]+userID="${plexUserId}"[^>]+id="(\\d+)"`, 'i');
      const altMatch = xmlText.match(altRegex);
      if (!altMatch) {
        console.log(`No shared server found for user ${plexUserId}`);
        return false;
      }
      match[1] = altMatch[1];
    }

    const sharedServerId = match[1];
    console.log(`Found shared server ${sharedServerId} for user ${plexUserId}`);

    // Update the shared server with section IDs via legacy API
    // Use PUT method with shared_server.library_section_ids format
    console.log(`Updating shared server ${sharedServerId} with sections: ${JSON.stringify(sectionIds)}`);
    const updateResponse = await fetch(`https://plex.tv/api/servers/${env.PLEX_MACHINE_ID}/shared_servers/${sharedServerId}`, {
      method: 'PUT',
      headers: {
        'X-Plex-Token': env.PLEX_TOKEN,
        'X-Plex-Client-Identifier': 'novix-tv',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shared_server: {
          library_section_ids: sectionIds,
        },
      }),
    });

    const responseText = await updateResponse.text();
    console.log(`Update response (${updateResponse.status}): ${responseText.substring(0, 200)}`);

    if (!updateResponse.ok) {
      throw new Error(`Failed to update library access (${updateResponse.status}): ${responseText}`);
    }

    console.log(`Updated library access for user ${plexUserId} to ${sectionIds.length} libraries`);
    return true;
  } catch (err) {
    console.error('Error updating library access:', err.message);
    return false;
  }
}

// Invite friend to Plex server (or update existing access)
// libraryKeys are the local library keys (like 1, 3, 4), NOT plex.tv section IDs
async function invitePlexFriend(env, email, libraryKeys = [], plexUserId = null) {
  // First check if user already has access (shared server exists)
  if (plexUserId) {
    try {
      const response = await fetch(`https://plex.tv/api/v2/shared_servers?machineIdentifier=${env.PLEX_MACHINE_ID}`, {
        headers: {
          'X-Plex-Token': env.PLEX_TOKEN,
          'X-Plex-Client-Identifier': 'novix-tv',
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const existingShare = data.find(s => String(s.userID) === String(plexUserId));

        if (existingShare) {
          // User already has access, just update their libraries
          console.log(`User ${plexUserId} already has shared server, updating libraries`);
          const updated = await updatePlexLibraryAccess(env, plexUserId, libraryKeys);
          if (updated) {
            return { updated: true, message: 'Library access updated' };
          }
        }
      }
    } catch (err) {
      console.error('Error checking existing share:', err.message);
    }
  }

  // No existing share found, send a new invite via plex.tv
  if (!email) {
    throw new Error('Cannot invite user: no email provided');
  }

  console.log(`Sending new Plex invite for ${email} (user ID: ${plexUserId})`);
  console.log(`Using machine ID: ${env.PLEX_MACHINE_ID}`);
  console.log(`Library keys: ${JSON.stringify(libraryKeys)}`);

  // Convert library keys to plex.tv section IDs
  const sectionIds = await getPlexSectionIds(env, libraryKeys);
  console.log(`Section IDs for invite: ${JSON.stringify(sectionIds)}`);

  // Use the /api/servers/{machineId}/shared_servers endpoint with JSON body
  const body = {
    server_id: env.PLEX_MACHINE_ID,
    shared_server: {
      library_section_ids: sectionIds,
      invited_email: email,
    },
    sharing_settings: {
      allowSync: '0',
      allowCameraUpload: '0',
      allowChannels: '0',
      filterMovies: '',
      filterTelevision: '',
      filterMusic: '',
    },
  };

  const response = await fetch(`https://plex.tv/api/servers/${env.PLEX_MACHINE_ID}/shared_servers`, {
    method: 'POST',
    headers: {
      'X-Plex-Token': env.PLEX_TOKEN,
      'X-Plex-Client-Identifier': 'novix-tv',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Plex invite error: ${error}`);
  }

  return response.json();
}

// Plex PIN auth - request a PIN
async function getPlexPin() {
  const response = await fetch('https://plex.tv/api/v2/pins', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Plex-Client-Identifier': 'novix-tv',
      'X-Plex-Product': 'NovixTV',
      'X-Plex-Version': '1.0.0',
      'X-Plex-Platform': 'Web',
    },
    body: JSON.stringify({ strong: true }),
  });

  if (!response.ok) {
    throw new Error('Failed to get Plex PIN');
  }

  return response.json();
}

// Plex PIN auth - check if PIN was claimed
async function checkPlexPin(pinId, pinCode) {
  const response = await fetch(`https://plex.tv/api/v2/pins/${pinId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Plex-Client-Identifier': 'novix-tv',
      'code': pinCode,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to check Plex PIN');
  }

  return response.json();
}

// Get Plex user info from auth token
async function getPlexUser(authToken) {
  const response = await fetch('https://plex.tv/api/v2/user', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Plex-Token': authToken,
      'X-Plex-Client-Identifier': 'novix-tv',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Plex user');
  }

  return response.json();
}

// Get Stripe client
function getStripe(env) {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: '2023-10-16',
  });
}

// Auth middleware
function requireAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7);
  return token === env.ADMIN_API_KEY;
}

// Route handlers
async function handleStripeWebhook(request, env) {
  const stripe = getStripe(env);
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return errorResponse('Webhook signature verification failed', 400);
  }

  console.log('Received Stripe event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        if (!userId) {
          console.error('No user_id in checkout session metadata');
          break;
        }

        // Check if this is an upgrade (old subscription needs to be cancelled)
        const oldSubscriptionId = session.metadata?.old_subscription_id;
        if (oldSubscriptionId) {
          try {
            // Cancel the old subscription immediately
            await stripe.subscriptions.cancel(oldSubscriptionId);
            await logActivity(env, userId, 'subscription_upgraded', `Upgraded from ${session.metadata.upgrade_from} to 4k plan`);
          } catch (err) {
            console.error('Failed to cancel old subscription:', err.message);
          }
        } else {
          await logActivity(env, userId, 'subscription_started', 'Subscription activated via checkout');
        }

        // Determine tier from price
        const newSubscriptionId = session.subscription;
        let tier = 'hd';
        if (newSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(newSubscriptionId);
          const priceId = subscription.items.data[0]?.price?.id;
          if (priceId === env.STRIPE_PRICE_4K) {
            tier = '4k';
          }
        }

        await supabase(env, 'users', {
          method: 'PATCH',
          query: `id=eq.${userId}`,
          body: {
            stripe_customer_id: session.customer,
            subscription_status: 'active',
            tier: tier,
          },
        });

        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const users = await supabase(env, 'users', {
          query: `stripe_customer_id=eq.${customerId}`,
        });

        if (users && users.length > 0) {
          const user = users[0];
          let status = subscription.status;
          if (status === 'active' || status === 'trialing') {
            status = 'active';
          } else if (status === 'past_due') {
            status = 'past_due';
          } else if (status === 'canceled' || status === 'unpaid') {
            status = 'cancelled';
          }

          await supabase(env, 'users', {
            method: 'PATCH',
            query: `id=eq.${user.id}`,
            body: {
              stripe_subscription_id: subscription.id,
              subscription_status: status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const users = await supabase(env, 'users', {
          query: `stripe_customer_id=eq.${customerId}`,
        });

        if (users && users.length > 0) {
          const user = users[0];

          await supabase(env, 'users', {
            method: 'PATCH',
            query: `id=eq.${user.id}`,
            body: { subscription_status: 'cancelled' },
          });

          // Remove from Plex
          if (user.plex_user_id) {
            try {
              await removePlexFriend(env, user.plex_user_id);
              await logActivity(env, user.id, 'plex_removed', 'Removed from Plex - subscription cancelled');
            } catch (err) {
              console.error('Failed to remove from Plex:', err.message);
              await logActivity(env, user.id, 'plex_removal_failed', `Failed to remove from Plex: ${err.message}`);
            }
          } else {
            await logActivity(env, user.id, 'subscription_cancelled', 'Subscription cancelled (no Plex ID to remove)');
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        const users = await supabase(env, 'users', {
          query: `stripe_customer_id=eq.${customerId}`,
        });

        if (users && users.length > 0) {
          const user = users[0];

          await supabase(env, 'users', {
            method: 'PATCH',
            query: `id=eq.${user.id}`,
            body: { subscription_status: 'past_due' },
          });

          await logActivity(env, user.id, 'payment_failed', `Payment failed for invoice ${invoice.id}`);
        }
        break;
      }
    }
  } catch (err) {
    console.error('Error processing webhook:', err);
    return errorResponse('Webhook processing error', 500);
  }

  return jsonResponse({ received: true });
}

async function handleGetUsers(env) {
  const users = await supabase(env, 'users', {
    query: 'order=created_at.desc',
  });
  return jsonResponse(users);
}

async function handleCreateUser(request, env) {
  const body = await request.json();
  const { display_name, email, plex_username, tier = 'hd' } = body;

  if (!display_name || !email || !plex_username) {
    return errorResponse('Missing required fields: display_name, email, plex_username');
  }

  const user = await supabase(env, 'users', {
    method: 'POST',
    body: { display_name, email, plex_username, tier },
  });

  await logActivity(env, user[0].id, 'user_created', `User ${display_name} created`);

  return jsonResponse(user[0], 201);
}

async function handleUpdateUser(userId, request, env) {
  const body = await request.json();
  const allowedFields = ['display_name', 'email', 'plex_username', 'plex_user_id', 'tier', 'library_ids'];
  const updates = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse('No valid fields to update');
  }

  const user = await supabase(env, 'users', {
    method: 'PATCH',
    query: `id=eq.${userId}`,
    body: updates,
  });

  return jsonResponse(user[0]);
}

async function handleDeleteUser(userId, env) {
  // Get user first to check for plex_user_id
  const users = await supabase(env, 'users', {
    query: `id=eq.${userId}`,
  });

  if (!users || users.length === 0) {
    return errorResponse('User not found', 404);
  }

  const user = users[0];

  // Remove from Plex if they have a plex_user_id
  if (user.plex_user_id) {
    try {
      await removePlexFriend(env, user.plex_user_id);
    } catch (err) {
      console.error('Failed to remove from Plex during delete:', err.message);
    }
  }

  await supabase(env, 'users', {
    method: 'DELETE',
    query: `id=eq.${userId}`,
  });

  return jsonResponse({ success: true });
}

async function handleCreateCheckout(userId, request, env) {
  const stripe = getStripe(env);

  // Get user
  const users = await supabase(env, 'users', {
    query: `id=eq.${userId}`,
  });

  if (!users || users.length === 0) {
    return errorResponse('User not found', 404);
  }

  const user = users[0];

  // Get price ID from request body or use default
  const body = await request.json().catch(() => ({}));
  const priceId = body.price_id || env.STRIPE_DEFAULT_PRICE_ID;

  // Create or get Stripe customer
  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.display_name,
      metadata: { user_id: userId },
    });
    customerId = customer.id;

    await supabase(env, 'users', {
      method: 'PATCH',
      query: `id=eq.${userId}`,
      body: { stripe_customer_id: customerId },
    });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}?checkout=success`,
    cancel_url: `${env.FRONTEND_URL}?checkout=cancelled`,
    metadata: { user_id: userId },
  });

  return jsonResponse({ checkout_url: session.url });
}

async function handleKickUser(userId, env) {
  // Get user
  const users = await supabase(env, 'users', {
    query: `id=eq.${userId}`,
  });

  if (!users || users.length === 0) {
    return errorResponse('User not found', 404);
  }

  const user = users[0];

  if (!user.plex_user_id) {
    return errorResponse('User has no Plex ID to kick', 400);
  }

  // Remove from Plex
  try {
    await removePlexFriend(env, user.plex_user_id);
  } catch (err) {
    return errorResponse(`Failed to remove from Plex: ${err.message}`, 500);
  }

  // Update user status
  await supabase(env, 'users', {
    method: 'PATCH',
    query: `id=eq.${userId}`,
    body: {
      subscription_status: 'kicked',
      plex_user_id: null,
    },
  });

  await logActivity(env, userId, 'manual_kick', `Manually kicked from Plex by admin`);

  return jsonResponse({ success: true });
}

async function handleGetActivity(env) {
  const activity = await supabase(env, 'activity_log', {
    query: 'select=*,users(display_name)&order=created_at.desc&limit=50',
  });
  return jsonResponse(activity);
}

async function handleGetPlexFriends(env) {
  const friends = await plexApi(env, '/api/v2/friends');
  return jsonResponse(friends);
}

async function handleGetPlexLibraries(env) {
  // Get libraries from the server
  const response = await fetch(`${env.PLEX_SERVER_URL}/library/sections`, {
    headers: {
      'X-Plex-Token': env.PLEX_TOKEN,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Plex libraries');
  }

  const data = await response.json();
  const libraries = data.MediaContainer.Directory || [];

  // Fetch item count for each library
  const librariesWithCounts = await Promise.all(
    libraries.map(async (lib) => {
      try {
        const countResponse = await fetch(
          `${env.PLEX_SERVER_URL}/library/sections/${lib.key}/all?X-Plex-Container-Start=0&X-Plex-Container-Size=0`,
          {
            headers: {
              'X-Plex-Token': env.PLEX_TOKEN,
              'Accept': 'application/json',
            },
          }
        );
        if (countResponse.ok) {
          const countData = await countResponse.json();
          return {
            ...lib,
            itemCount: countData.MediaContainer?.totalSize || 0,
          };
        }
      } catch (err) {
        console.error(`Failed to get count for library ${lib.key}:`, err);
      }
      return { ...lib, itemCount: 0 };
    })
  );

  return jsonResponse(librariesWithCounts);
}

async function handleHealth() {
  return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
}

// Public stats endpoint - aggregates library counts
async function handleGetStats(env) {
  try {
    // Get libraries from the server
    const response = await fetch(`${env.PLEX_SERVER_URL}/library/sections`, {
      headers: {
        'X-Plex-Token': env.PLEX_TOKEN,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Plex libraries');
    }

    const data = await response.json();
    const libraries = data.MediaContainer.Directory || [];

    // Fetch item count for each library in parallel
    const librariesWithCounts = await Promise.all(
      libraries.map(async (lib) => {
        try {
          const countResponse = await fetch(
            `${env.PLEX_SERVER_URL}/library/sections/${lib.key}/all?X-Plex-Container-Start=0&X-Plex-Container-Size=0`,
            {
              headers: {
                'X-Plex-Token': env.PLEX_TOKEN,
                'Accept': 'application/json',
              },
            }
          );
          if (countResponse.ok) {
            const countData = await countResponse.json();
            return {
              type: lib.type,
              itemCount: countData.MediaContainer?.totalSize || 0,
            };
          }
        } catch (err) {
          console.error(`Failed to get count for library ${lib.key}:`, err);
        }
        return { type: lib.type, itemCount: 0 };
      })
    );

    // Aggregate by type
    let totalMovies = 0;
    let totalShows = 0;

    for (const lib of librariesWithCounts) {
      if (lib.type === 'movie') {
        totalMovies += lib.itemCount;
      } else if (lib.type === 'show') {
        totalShows += lib.itemCount;
      }
    }

    return jsonResponse({
      movies: totalMovies,
      tvShows: totalShows,
    });
  } catch (err) {
    console.error('Failed to get stats:', err);
    return jsonResponse({
      movies: 0,
      tvShows: 0,
    });
  }
}

// === PUBLIC ROUTES (Customer signup flow) ===

// Start Plex auth - returns PIN and auth URL
async function handlePlexAuthStart() {
  const pin = await getPlexPin();
  const authUrl = `https://app.plex.tv/auth#?clientID=novix-tv&code=${pin.code}&context%5Bdevice%5D%5Bproduct%5D=NovixTV`;

  return jsonResponse({
    pin_id: pin.id,
    pin_code: pin.code,
    auth_url: authUrl,
    expires_at: pin.expiresAt,
  });
}

// Check Plex auth status - returns user info if authorized
async function handlePlexAuthCheck(request) {
  const url = new URL(request.url);
  const pinId = url.searchParams.get('pin_id');
  const pinCode = url.searchParams.get('pin_code');

  if (!pinId || !pinCode) {
    return errorResponse('Missing pin_id or pin_code', 400);
  }

  const pin = await checkPlexPin(pinId, pinCode);

  if (!pin.authToken) {
    return jsonResponse({ authorized: false });
  }

  // Get user info
  const user = await getPlexUser(pin.authToken);

  return jsonResponse({
    authorized: true,
    plex_user: {
      id: user.id,
      username: user.username,
      email: user.email,
      thumb: user.thumb,
      authToken: pin.authToken, // CRITICAL: Include the token so frontend can save it
    },
  });
}

// Customer signup - create user and checkout session
async function handleCustomerSignup(request, env) {
  const stripe = getStripe(env);
  const body = await request.json();
  const { plex_user_id, plex_username, plex_email, tier = 'hd' } = body;

  if (!plex_user_id || !plex_username || !plex_email) {
    return errorResponse('Missing required Plex user info', 400);
  }

  // Check if user already exists
  const existingUsers = await supabase(env, 'users', {
    query: `plex_user_id=eq.${plex_user_id}`,
  });

  let user;
  if (existingUsers && existingUsers.length > 0) {
    user = existingUsers[0];
    // If already active, don't allow re-signup
    if (user.subscription_status === 'active') {
      return errorResponse('You already have an active subscription', 400);
    }
  } else {
    // Create new user
    const newUsers = await supabase(env, 'users', {
      method: 'POST',
      body: {
        display_name: plex_username,
        email: plex_email,
        plex_username: plex_username,
        plex_user_id: String(plex_user_id),
        tier,
      },
    });
    user = newUsers[0];
    await logActivity(env, user.id, 'user_signed_up', `User ${plex_username} signed up via Plex`);
  }

  // Create or get Stripe customer
  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: plex_email,
      name: plex_username,
      metadata: { user_id: user.id, plex_user_id: String(plex_user_id) },
    });
    customerId = customer.id;

    await supabase(env, 'users', {
      method: 'PATCH',
      query: `id=eq.${user.id}`,
      body: { stripe_customer_id: customerId },
    });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: env.STRIPE_DEFAULT_PRICE_ID, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/signup?cancelled=true`,
    metadata: { user_id: user.id },
  });

  return jsonResponse({ checkout_url: session.url, user_id: user.id });
}

// Change subscription plan (upgrade/downgrade) - uses Stripe's proration
async function handleChangeSubscription(request, env) {
  const stripe = getStripe(env);
  const body = await request.json();
  const { plex_user_id, new_tier } = body;

  if (!plex_user_id || !new_tier) {
    return errorResponse('Missing plex_user_id or new_tier', 400);
  }

  if (!['hd', '4k', 'admin'].includes(new_tier)) {
    return errorResponse('Invalid tier. Must be "hd", "4k", or "admin"', 400);
  }

  // Get user
  const users = await supabase(env, 'users', {
    query: `plex_user_id=eq.${plex_user_id}`,
  });

  if (!users || users.length === 0) {
    return errorResponse('User not found', 404);
  }

  const user = users[0];

  // Admin tier doesn't require Stripe subscription - skip Stripe checks
  if (new_tier !== 'admin' && user.tier !== 'admin') {
    if (!user.stripe_subscription_id) {
      return errorResponse('No active subscription found', 400);
    }

    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

    if (subscription.status !== 'active') {
      return errorResponse('Subscription is not active', 400);
    }

    // Get the new price ID
    const newPriceId = new_tier === '4k' ? env.STRIPE_PRICE_4K : env.STRIPE_PRICE_HD;

    // Update the subscription with proration
    // Stripe automatically handles:
    // - Upgrade: charges the prorated difference immediately
    // - Downgrade: credits unused time to next invoice
    await stripe.subscriptions.update(user.stripe_subscription_id, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'always_invoice', // Creates invoice immediately for upgrades
      payment_behavior: 'error_if_incomplete', // Fail if payment doesn't go through
    });
  }

  // Update user tier in database
  await supabase(env, 'users', {
    method: 'PATCH',
    query: `id=eq.${user.id}`,
    body: { tier: new_tier },
  });

  // Update Plex library access
  const newLibraryIds = getLibraryKeysForTier(env, new_tier);
  const libraryUpdated = await updatePlexLibraryAccess(env, plex_user_id, newLibraryIds);

  const action = new_tier === '4k' ? 'Upgraded' : (new_tier === 'admin' ? 'Set to admin' : 'Downgraded');
  await logActivity(env, user.id, 'subscription_changed', `${action} to ${new_tier} plan (${newLibraryIds.length} libraries)`);

  if (!libraryUpdated) {
    await logActivity(env, user.id, 'library_update_failed', `Failed to update Plex library access for ${new_tier} tier`);
  }

  return jsonResponse({ success: true, new_tier });
}

// Cancel subscription immediately
async function handleCancelSubscription(request, env) {
  const stripe = getStripe(env);
  const body = await request.json();
  const { plex_user_id } = body;

  if (!plex_user_id) {
    return errorResponse('Missing plex_user_id', 400);
  }

  // Get user
  const users = await supabase(env, 'users', {
    query: `plex_user_id=eq.${plex_user_id}`,
  });

  if (!users || users.length === 0) {
    return errorResponse('User not found', 404);
  }

  const user = users[0];

  // Admin accounts cannot be cancelled via this endpoint
  if (user.tier === 'admin') {
    return errorResponse('Admin accounts cannot be cancelled', 400);
  }

  if (!user.stripe_subscription_id) {
    return errorResponse('No active subscription found', 400);
  }

  // Cancel the subscription immediately
  await stripe.subscriptions.cancel(user.stripe_subscription_id);

  // Update user status
  await supabase(env, 'users', {
    method: 'PATCH',
    query: `id=eq.${user.id}`,
    body: { subscription_status: 'cancelled' },
  });

  // Remove from Plex immediately
  if (user.plex_user_id) {
    try {
      const result = await removePlexFriend(env, user.plex_user_id);
      await logActivity(env, user.id, 'plex_removed', 'Removed from Plex - subscription cancelled by user');

      // Log Tautulli removal
      if (result?.tautulliResult?.success) {
        await logActivity(env, user.id, 'tautulli_removed', 'Removed from Tautulli');
      } else if (result?.tautulliResult) {
        await logActivity(env, user.id, 'tautulli_removal_failed', `Failed to remove from Tautulli: ${result.tautulliResult.message}`);
      }
    } catch (err) {
      console.error('Failed to remove from Plex:', err.message);
      await logActivity(env, user.id, 'plex_removal_failed', `Failed to remove from Plex: ${err.message}`);
    }
  }

  await logActivity(env, user.id, 'subscription_cancelled', 'Subscription cancelled by user');

  return jsonResponse({ success: true });
}

// Get user subscription status (public - by plex_user_id)
async function handleGetUserSubscription(request, env) {
  const url = new URL(request.url);
  const plexUserId = url.searchParams.get('plex_user_id');

  if (!plexUserId) {
    return errorResponse('Missing plex_user_id', 400);
  }

  const users = await supabase(env, 'users', {
    query: `plex_user_id=eq.${plexUserId}`,
  });

  if (!users || users.length === 0) {
    return jsonResponse({ subscription_status: null });
  }

  const user = users[0];
  return jsonResponse({
    subscription_status: user.subscription_status,
    tier: user.tier,
    current_period_end: user.current_period_end,
  });
}

// Handle successful checkout - invite to Plex
async function handleCheckoutSuccess(request, env) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return errorResponse('Missing session_id', 400);
  }

  const stripe = getStripe(env);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    return errorResponse('Payment not completed', 400);
  }

  const userId = session.metadata?.user_id;
  if (!userId) {
    return errorResponse('Invalid session', 400);
  }

  // Get user
  const users = await supabase(env, 'users', {
    query: `id=eq.${userId}`,
  });

  if (!users || users.length === 0) {
    return errorResponse('User not found', 404);
  }

  const user = users[0];

  // Determine tier from the checkout session's subscription
  let tier = user.tier || 'hd';
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const priceId = subscription.items.data[0]?.price?.id;
    if (priceId === env.STRIPE_PRICE_4K) {
      tier = '4k';
    } else {
      tier = 'hd';
    }
  }

  // Update user status to active since payment is confirmed
  // (Webhook may not have processed yet)
  await supabase(env, 'users', {
    method: 'PATCH',
    query: `id=eq.${user.id}`,
    body: {
      subscription_status: 'active',
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      tier: tier,
    },
  });

  // Invite to Plex now that we've confirmed payment
  if (user.plex_user_id) {
    try {
      // Get library IDs based on tier
      const libraryIds = getLibraryKeysForTier(env, tier);
      const result = await invitePlexFriend(env, user.email, libraryIds, user.plex_user_id);
      if (result.updated) {
        await logActivity(env, user.id, 'plex_access_updated', `Updated Plex access with ${libraryIds.length} libraries (${tier} tier)`);
      } else {
        await logActivity(env, user.id, 'plex_invited', `Invited to Plex server with ${libraryIds.length} libraries (${tier} tier)`);
      }
    } catch (err) {
      console.error('Failed to invite to Plex:', err.message);
      await logActivity(env, user.id, 'plex_invite_failed', `Failed to invite: ${err.message}`);
    }
  } else {
    console.error('User has no plex_user_id:', user.id);
    await logActivity(env, user.id, 'plex_invite_skipped', 'No plex_user_id found for user');
  }

  return jsonResponse({ success: true, user_id: userId });
}

// ===== DEVICE AUTHENTICATION FUNCTIONS =====

// Generate unique 4-digit device code
async function generateUniqueCode(env) {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // Check if code already exists and is still active
    try {
      const existing = await supabase(env, 'device_auth_codes', {
        method: 'GET',
        query: `code=eq.${code}&activated=eq.false&expires_at=gt.${new Date().toISOString()}`,
        single: true
      });

      // If no active code exists with this number, we're good!
      if (!existing) {
        return code;
      }

      // Collision detected, try again
      console.log(`Code ${code} collision detected (attempt ${attempt + 1}), retrying...`);
    } catch (err) {
      // PGRST116 means no rows returned, which is what we want
      if (err.message.includes('PGRST116') || err.message.includes('no rows')) {
        return code;
      }
      throw err;
    }
  }

  // If we failed after 10 attempts, throw error
  throw new Error('Failed to generate unique code after 10 attempts');
}

// POST /api/device/code - Generate device activation code
async function handleGenerateDeviceCode(env) {
  try {
    const code = await generateUniqueCode(env);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Insert into database
    await supabase(env, 'device_auth_codes', {
      method: 'POST',
      body: {
        code,
        expires_at: expiresAt.toISOString(),
        activated: false
      }
    });

    return jsonResponse({
      code,
      verification_url: `${env.FRONTEND_URL}/link`,
      expires_in: 900, // seconds
      interval: 5 // poll every 5 seconds
    });
  } catch (err) {
    console.error('Error generating device code:', err);
    return errorResponse('Failed to generate device code', 500);
  }
}

// GET /api/device/poll?code=1234 - Check if code has been activated
async function handlePollDeviceCode(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return errorResponse('Code parameter required', 400);
  }

  try {
    // Look up code in database
    const deviceCode = await supabase(env, 'device_auth_codes', {
      method: 'GET',
      query: `code=eq.${code}`,
      single: true
    });

    if (!deviceCode) {
      return errorResponse('Invalid code', 404);
    }

    // Check if expired
    const expiresAt = new Date(deviceCode.expires_at);
    if (expiresAt < new Date()) {
      return errorResponse('Code expired', 410);
    }

    // Check if activated
    if (deviceCode.activated && deviceCode.auth_token) {
      // Return user info if we have it
      let user = null;
      let plexConnection = null;
      let iptvConnection = null;

      if (deviceCode.user_id) {
        try {
          // Fetch user data
          user = await supabase(env, 'users', {
            method: 'GET',
            query: `id=eq.${deviceCode.user_id}`,
            single: true
          });

          // Fetch Plex connection
          try {
            plexConnection = await supabase(env, 'plex_connections', {
              method: 'GET',
              query: `user_id=eq.${deviceCode.user_id}`,
              single: true
            });
          } catch (err) {
            // No Plex connection is okay
            if (!err.message.includes('PGRST116')) {
              console.error('Error fetching Plex connection:', err);
            }
          }

          // Fetch IPTV connection
          try {
            iptvConnection = await supabase(env, 'iptv_connections', {
              method: 'GET',
              query: `user_id=eq.${deviceCode.user_id}`,
              single: true
            });
          } catch (err) {
            // No IPTV connection is okay
            if (!err.message.includes('PGRST116')) {
              console.error('Error fetching IPTV connection:', err);
            }
          }

        } catch (err) {
          console.error('Error fetching user:', err);
        }
      }

      return jsonResponse({
        activated: true,
        auth_token: deviceCode.auth_token,
        user: user ? {
          id: user.id,
          email: user.email,
          subscription_tier: user.subscription_tier
        } : null,
        plex_connection: plexConnection ? {
          plex_user_id: plexConnection.plex_user_id,
          plex_username: plexConnection.plex_username,
          plex_email: plexConnection.plex_email,
          plex_token: plexConnection.plex_token
        } : null,
        iptv_connection: iptvConnection ? {
          provider_name: iptvConnection.provider_name,
          connection_type: iptvConnection.connection_type,
          m3u_url: iptvConnection.m3u_url,
          xtream_host: iptvConnection.xtream_host,
          xtream_username: iptvConnection.xtream_username,
          xtream_password: iptvConnection.xtream_password
        } : null
      });
    }

    // Not activated yet, return time remaining
    const expiresIn = Math.floor((expiresAt - new Date()) / 1000);
    return jsonResponse({
      activated: false,
      expires_in: expiresIn
    });

  } catch (err) {
    console.error('Error polling device code:', err);
    return errorResponse('Failed to check code status', 500);
  }
}

// POST /api/device/activate - Activate device code (requires user auth)
async function handleActivateDevice(request, env) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return errorResponse('Code required', 400);
    }

    // Get authorization header (Supabase session token)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401);
    }

    const sessionToken = authHeader.substring(7);

    // Verify session with Supabase
    const sessionResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'apikey': env.SUPABASE_ANON_KEY
      }
    });

    if (!sessionResponse.ok) {
      return errorResponse('Invalid session', 401);
    }

    const sessionUser = await sessionResponse.json();

    // Get user record from our users table
    const user = await supabase(env, 'users', {
      method: 'GET',
      query: `auth_id=eq.${sessionUser.id}`,
      single: true
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Look up device code
    const deviceCode = await supabase(env, 'device_auth_codes', {
      method: 'GET',
      query: `code=eq.${code}`,
      single: true
    });

    if (!deviceCode) {
      return errorResponse('Invalid code', 404);
    }

    // Check if expired
    const expiresAt = new Date(deviceCode.expires_at);
    if (expiresAt < new Date()) {
      return errorResponse('Code expired', 410);
    }

    // Check if already activated
    if (deviceCode.activated) {
      return errorResponse('Code already used', 409);
    }

    // Generate auth token for TV app
    const authToken = crypto.randomUUID();

    // Update device code - mark as activated
    await supabase(env, 'device_auth_codes', {
      method: 'PATCH',
      query: `id=eq.${deviceCode.id}`,
      body: {
        activated: true,
        user_id: user.id,
        auth_token: authToken,
        activated_at: new Date().toISOString()
      }
    });

    return jsonResponse({
      success: true,
      message: 'Device activated successfully'
    });

  } catch (err) {
    console.error('Error activating device:', err);
    return errorResponse('Failed to activate device', 500);
  }
}

// Main router
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // === PUBLIC ROUTES (no auth required) ===

      // Health check
      if (path === '/api/health' && method === 'GET') {
        return handleHealth();
      }

      // Public stats (library counts)
      if (path === '/api/stats' && method === 'GET') {
        return handleGetStats(env);
      }

      // Stripe webhook (verified via signature)
      if (path === '/api/webhook/stripe' && method === 'POST') {
        return handleStripeWebhook(request, env);
      }

      // Plex auth flow (public)
      if (path === '/api/plex/auth/start' && method === 'POST') {
        return handlePlexAuthStart();
      }
      if (path === '/api/plex/auth/check' && method === 'GET') {
        return handlePlexAuthCheck(request);
      }

      // Device authentication (TV app)
      if (path === '/api/device/code' && method === 'POST') {
        return handleGenerateDeviceCode(env);
      }
      if (path === '/api/device/poll' && method === 'GET') {
        return handlePollDeviceCode(request, env);
      }
      if (path === '/api/device/activate' && method === 'POST') {
        return handleActivateDevice(request, env);
      }

      // Customer signup (public)
      if (path === '/api/signup' && method === 'POST') {
        return handleCustomerSignup(request, env);
      }

      // User subscription status (public)
      if (path === '/api/user/subscription' && method === 'GET') {
        return handleGetUserSubscription(request, env);
      }

      // Checkout success callback (public)
      if (path === '/api/checkout/success' && method === 'GET') {
        return handleCheckoutSuccess(request, env);
      }

      // Subscription management (public - authenticated via plex_user_id)
      if (path === '/api/subscription/change' && method === 'POST') {
        return handleChangeSubscription(request, env);
      }
      if (path === '/api/subscription/cancel' && method === 'POST') {
        return handleCancelSubscription(request, env);
      }

      // === ADMIN ROUTES (auth required) ===
      if (!requireAuth(request, env)) {
        return errorResponse('Unauthorized', 401);
      }

      // Users routes
      if (path === '/api/users' && method === 'GET') {
        return handleGetUsers(env);
      }
      if (path === '/api/users' && method === 'POST') {
        return handleCreateUser(request, env);
      }

      // User-specific routes
      const userMatch = path.match(/^\/api\/users\/([^\/]+)$/);
      if (userMatch) {
        const userId = userMatch[1];
        if (method === 'PUT') {
          return handleUpdateUser(userId, request, env);
        }
        if (method === 'DELETE') {
          return handleDeleteUser(userId, env);
        }
      }

      // User actions
      const checkoutMatch = path.match(/^\/api\/users\/([^\/]+)\/checkout$/);
      if (checkoutMatch && method === 'POST') {
        return handleCreateCheckout(checkoutMatch[1], request, env);
      }

      const kickMatch = path.match(/^\/api\/users\/([^\/]+)\/kick$/);
      if (kickMatch && method === 'POST') {
        return handleKickUser(kickMatch[1], env);
      }

      // Activity log
      if (path === '/api/activity' && method === 'GET') {
        return handleGetActivity(env);
      }

      // Plex routes
      if (path === '/api/plex/friends' && method === 'GET') {
        return handleGetPlexFriends(env);
      }
      if (path === '/api/plex/libraries' && method === 'GET') {
        return handleGetPlexLibraries(env);
      }

      return errorResponse('Not found', 404);
    } catch (err) {
      console.error('Error:', err);
      return errorResponse(err.message || 'Internal server error', 500);
    }
  },
};
