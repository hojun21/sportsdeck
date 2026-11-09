export const metadata = { title: "Privacy Policy | SportsDeck" };

export default function PrivacyPage() {
    return (
        <main className="max-w-2xl mx-auto px-4 py-12 space-y-4 text-sm leading-6">
            <h1 className="text-2xl font-bold">Privacy Policy</h1>
            <p>SportsDeck is a student portfolio project. This page explains what data it collects and how it is used.</p>

            <h2 className="text-lg font-semibold pt-2">What we collect</h2>
            <ul className="list-disc pl-5">
                <li>Account details: email address, username, and a hashed password (or, with Google sign-in, your Google name and email).</li>
                <li>Content you post: threads, replies, poll votes, and reports.</li>
            </ul>

            <h2 className="text-lg font-semibold pt-2">How it is used</h2>
            <ul className="list-disc pl-5">
                <li>To run your account and show your posts in the forums.</li>
                <li>Posted text may be sent to Hugging Face and Google Gemini for moderation, sentiment analysis, translation, and summaries.</li>
                <li>A sign-in cookie keeps you logged in. No advertising or tracking cookies are used.</li>
            </ul>

            <h2 className="text-lg font-semibold pt-2">Sharing</h2>
            <p>Your data is not sold or shared with anyone other than the services listed above.</p>

            <h2 className="text-lg font-semibold pt-2">Contact and deletion</h2>
            <p>
                To have your account deleted, open an issue at{" "}
                <a className="underline" href="https://github.com/hojun21/sportsdeck/issues">github.com/hojun21/sportsdeck</a>.
            </p>
        </main>
    );
}
