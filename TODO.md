# CineVault TODO

## Pending Issues

### Tautulli API 403 Error
- When cancelling a subscription, Tautulli returns a 403 error when trying to delete the user
- The Tautulli URL/API key are correct (tested manually with curl and it works)
- May be a network/firewall issue with Cloudflare Workers reaching the Tautulli server
- Investigate: Could be Tautulli blocking requests without proper headers or from certain IPs

### Clean Up Invite Error Handling
- The Plex invite function logs harmless errors that can be ignored:
  - "You're already sharing this server" - happens when success page is called twice
  - "Unexpected token '<'" JSON parse error - Plex returns XML but code tries to parse as JSON
- These don't affect functionality but clutter the logs
- Clean up to suppress these expected errors

## Completed

- [x] Fix Plex invite after signup (convert library keys to section IDs)
- [x] Fix upgrade/downgrade library access (use legacy API with PUT method)
- [x] Cancellation removes Plex library access immediately (sets to 0 libraries first)
- [x] Cancellation removes shared server access
- [x] Cancellation removes friend relationship
- [x] Activity logging for Plex removal and Tautulli removal attempts
