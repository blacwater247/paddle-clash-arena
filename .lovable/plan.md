Plan: Google Search Console verification for Paddle Clash Arena

1. Update meta tag in `src/routes/__root.tsx`
   - Replace `REPLACE_WITH_GSC_TOKEN` with the real token: `DTCp5AGNUnpaFTIVvSFavyfBNxpzfOIPka0iY-lCuhQ`.

2. Publish the site
   - Run the publish flow so the new meta tag is live at `https://paddle-clash-arena.lovable.app`.

3. Verify ownership via Google Search Console connector
   - Use the workspace `EMA TRADE` Google Search Console connection (google_search_console connector) to run the META verification API calls.
   - Call the Site Verification `/webResource` endpoint with `verificationMethod=META`.
   - Then call Search Console `/sites` PUT to add the verified site to the property list.

4. Confirm result
   - Report whether verification succeeded and the site is now in the user's GSC property list.