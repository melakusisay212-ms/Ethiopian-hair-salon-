# Ethiopian Hair Salon Manager

Real Android app for hair salon owners in Ethiopia.

**Repository:** https://github.com/melakusisay212-ms/Ethiopian-hair-salon-

## Features

- **Today** and **Tomorrow** views (based on each client’s personal cycle)
- One-tap SMS reminder (opens phone SMS already filled)
- Add / Edit / Delete clients
- **CSV Import** from KoboCollect / KoboToolbox
- English + Amharic language switch
- Fully offline (all data stays on the phone)
- Cycle counter (loyalty / frequent client recognition)
- Easy to rebrand for different salons

## Frequency options
- Every 2 weeks
- Every 1 month
- Every 2 months
- Every 3 months

## How to build the APK (needs a computer once)

### Requirements
- Node.js 18+
- Android Studio

### Steps
```bash
git clone https://github.com/melakusisay212-ms/Ethiopian-hair-salon-.git
cd Ethiopian-hair-salon-
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Then in Android Studio: **Build → Build APK(s)**

The APK will be in:
`android/app/build/outputs/apk/debug/`

Transfer it to the salon owner’s phone and install (allow “Unknown sources”).

## CSV Import
On the **Clients** tab → tap **Import CSV** → choose the file exported from Kobo.

The app looks for columns named like:
- name / full name
- phone / mobile
- frequency
- status
- last service
- notes

## SMS
Currently uses the reliable method: opens the normal SMS app already filled with number + message. Owner just presses Send. Zero extra cost.

## License
Private project for Ethiopian salon owners.
