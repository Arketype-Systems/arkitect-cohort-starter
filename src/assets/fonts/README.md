# Bundled report fonts

Noto Sans Regular and Bold are from the official notofonts/noto-fonts repository at ffebf8c1ee449e544955a7e813c54f9b73848eac, hinted/ttf/NotoSans/. LICENSE.txt is the upstream SIL Open Font License. The app loads these local font assets only when generating PDF reports. No font request is sent to a third-party host. The fonts cover Latin, Greek and Cyrillic; unsupported glyphs produce a clear export error with the browser-print alternative rather than silently corrupting text.

UI fonts DM Sans and Manrope are also bundled locally from the Google Fonts distribution, with upstream OFL files from google/fonts 6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec. The CSS and all referenced binaries are local build inputs.
