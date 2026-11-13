# Struktur Aplikasi

Dokumen ini mendefinisikan struktur tingkat tinggi aplikasi Travel & Tours.

```text
App
├── AuthScreen
│   ├── Login
│   └── Guest
│
├── AppShell
│   ├── Header
│   │   ├── Logo
│   │   └── HeaderActions
│   │       ├── NotifBtn
│   │       └── ProfileBtn
│   │
│   ├── Content
│   │   ├── HomePage
│   │   ├── ExplorePage
│   │   ├── LiveChatPage
│   │   ├── ProfilePage
│   │   └── NotificationPage
│   │
│   └── BottomNav
│       ├── Home
│       ├── Explore
│       └── LiveChat
│
├── StandalonePages
│   ├── Header
│   │
│   ├── Content
│   │   ├── DestinationDetailPage
│   │   ├── TourDetailPage
│   │   ├── SearchResultsPage
│   │   ├── BookingPage
│   │   ├── CheckoutPage
│   │   ├── PaymentPage
│   │   ├── PaymentResultPage
│   │   ├── BookingDetailPage
│   │   ├── EditProfilePage
│   │   ├── SettingsPage
│   │   ├── HelpCenterPage
│   │   ├── ReviewPage
│   │   ├── TermsPage
│   │   └── PrivacyPolicyPage
│   │
│   └── BottomAction
│
└── Overlays
    ├── NotificationPanel
    ├── ProfileMenu
    ├── SearchOverlay
    ├── Modal
    ├── BottomSheet
    ├── Toast
    └── LoadingOverlay
```
