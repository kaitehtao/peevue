import type {Metadata} from "next";
export const metadata:Metadata={title:"Privacy Policy | PEEVUE",alternates:{canonical:"https://peevue.com/privacy"}};
import { Header, Footer } from "@/components/community/header";

export default function Privacy() {
  return <><Header /><main style={{ maxWidth: 800, margin: "60px auto", padding: "0 24px", lineHeight: 1.8 }}>
    <p className="eyebrow">YOUR PRIVACY</p>
    <h1>PEEVUE privacy policy</h1>
    <p>Updated October 3, 2026. This page describes how peevue.com handles information when you browse bathrooms, create an account, or contribute reviews and photos.</p>
    <h2>Account information</h2>
    <p>Google sign-in shares your Google account identifier, email address, and basic profile information with PEEVUE and our authentication provider, Supabase. We use this information to authenticate you, associate submissions with your account, and verify administrator access where authorized. PEEVUE does not receive your Google password or request access to Gmail. Email and password accounts are also managed by Supabase. Your browser stores a sign-in session so you can stay signed in.</p>
    <h2>Reviews and photos</h2>
    <p>We store the display name, cleanliness rating, review text, visit details, bathroom access code if supplied, venue information, and photos you submit. Approved contributions are public, including the submitted display name and bathroom location. Your account email is not included in public review responses. Pending and rejected submissions are available to administrators for moderation; signed-in contributors can view their own submissions. Guest submissions do not require an account.</p>
    <p>Photos are processed to remove embedded metadata before storage. Approved photos are publicly viewable; unapproved photos remain in private storage. Please avoid uploading people, personal information, or private access codes you are not authorized to share.</p>
    <h2>Location</h2>
    <p>Using your current location is optional and requires browser permission. Location is requested when you choose that feature, rather than tracked in the background. You can enter an address manually. Address searches or rounded coordinates may be sent to OpenStreetMap Nominatim to identify the bathroom. Submitted venue addresses and coordinates may be published after moderation. Account emails, names, and review text are not sent to the geocoder.</p>
    <h2>Service providers and security</h2>
    <p>Cloudflare hosts the website and processes requests. Supabase provides authentication, database services, and photo storage. Google processes Google sign-in. These providers process information needed to operate their services. Requests include technical information such as an IP address; PEEVUE uses a keyed hash of the IP address for submission and location-search limits. Administrators can access submissions and moderation records to maintain the service.</p>
    <h2>Retention and your choices</h2>
    <p>Accounts, contributions, and moderation records are retained to operate the service. Rejected or excluded photos are not automatically deleted. You can update your account display name on the account page; this does not rewrite previously submitted review names. For access, correction, removal, or account deletion requests, contact <a href="mailto:kaitehtao@gmail.com">kaitehtao@gmail.com</a>. These requests are handled manually and may require identity verification. Signing out or revoking Google access does not automatically delete existing contributions.</p>
    <h2>Contact and updates</h2>
    <p>For privacy questions, email <a href="mailto:kaitehtao@gmail.com">kaitehtao@gmail.com</a>. Changes to this policy will be posted here with an updated date.</p>
  </main><Footer /></>;
}
