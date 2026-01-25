import Link from "next/link";

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-black text-green-300 font-mono px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/" className="text-green-200/80 hover:text-green-200">
            ← back to feed
          </Link>
        </div>

        <p className="text-xs text-green-400/70">
  If you do not agree to these rules, please do not create an account or submit posts.
</p>


        <h1 className="text-2xl text-green-200 tracking-wider">Rules & Disclaimers</h1>
        <p className="mt-2 text-xs text-green-400/70">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="my-6 border-t border-green-700/40" />

        {/* IMPORTANT / NOT AFFILIATED */}
        <section className="grid gap-3">
          <h2 className="text-green-200 text-lg">Unofficial Community Project</h2>
          <p className="text-sm text-green-200/80 leading-relaxed">
            The Surface Log is an independent, community-driven project. It is not affiliated with,
            endorsed by, or sponsored by Embark Studios, ARC Raiders, or any associated entities.
          </p>
          <p className="text-sm text-green-200/70 leading-relaxed">
            Posts on this site are player-submitted reports and opinions. They are not verified facts,
            and this site does not represent official moderation, enforcement, or player conduct systems.
          </p>
        </section>

        <div className="my-6 border-t border-green-700/40" />

        {/* POSTING RULES */}
        <section className="grid gap-3">
          <h2 className="text-green-200 text-lg">Rules for Posting</h2>

          <ul className="list-disc pl-5 text-sm text-green-200/80 grid gap-2">
            <li>
              Keep it about gameplay interactions. Don’t post real-life personal info (no addresses,
              phone numbers, emails, full legal names, etc.).
            </li>
            <li>
              No doxxing, threats, harassment, hate speech, or encouraging violence.
            </li>
            <li>
              Don’t claim crimes or serious wrongdoing as fact unless you have strong evidence.
              Use “I experienced / I observed” language.
            </li>
            <li>
              No impersonation. Don’t pretend to be staff, developers, moderators, or other players.
            </li>
            <li>
              Keep descriptions relevant. Excessive spam, repeated posts, or copy/paste brigading may be removed.
            </li>
            <li>
              You can swear. Profanity is allowed. (But targeted slurs/hate speech is not.)
            </li>
            <li>
              Use the flag/report tools if a post is wrong, abusive, or misleading.
            </li>
          </ul>

          <p className="text-xs text-green-400/70 leading-relaxed">
            We may hide or remove content that violates these rules, even if it doesn’t violate any law.
          </p>
        </section>

        <div className="my-6 border-t border-green-700/40" />

        {/* REPORTING RULES */}
        <section className="grid gap-3">
          <h2 className="text-green-200 text-lg">Rules for Reporting Others</h2>

          <ul className="list-disc pl-5 text-sm text-green-200/80 grid gap-2">
            <li>
              Be specific: what happened, when, and why it mattered. Avoid “this person sucks” with no details.
            </li>
            <li>
              Don’t use the site to start witch-hunts or encourage harassment of someone off-site.
            </li>
            <li>
              If it’s a serious claim, include context that helps others evaluate it (without posting private info).
            </li>
            <li>
              If you made a mistake, submit a correction (or flag your own post) rather than doubling down.
            </li>
            <li>
              This site is not a substitute for official reporting tools inside the game/platform.
            </li>
          </ul>
        </section>

        <div className="my-6 border-t border-green-700/40" />

        {/* DISPUTES / FLAGS */}
        <section className="grid gap-3">
          <h2 className="text-green-200 text-lg">Disputes, Flags, and Corrections</h2>

          <ul className="list-disc pl-5 text-sm text-green-200/80 grid gap-2">
            <li>
              If you believe a post is inaccurate or abusive, use the flag/report feature.
            </li>
            <li>
              Flagging is for disputes and rule violations—not just because you don’t like a negative report.
            </li>
            <li>
              We may hide posts that receive repeated flags while reviewing (depending on how you configure it).
            </li>
          </ul>

          <p className="text-xs text-green-400/70 leading-relaxed">
            We don’t guarantee removal. We aim for fairness, but this is a community log—not a court.
          </p>
        </section>

        <div className="my-6 border-t border-green-700/40" />

        {/* DATA COLLECTION / STORAGE */}
        <section className="grid gap-3">
          <h2 className="text-green-200 text-lg">Data Collection & Storage</h2>

          <p className="text-sm text-green-200/80 leading-relaxed">
            By signing up or signing in, you agree that we may collect and store limited data necessary to operate the site.
          </p>

          <div className="border border-green-700/40 rounded-lg p-4 bg-black">
            <div className="text-xs text-green-200/70 mb-2">What we collect</div>
            <ul className="list-disc pl-5 text-sm text-green-200/80 grid gap-2">
              <li>Your account email (via Supabase auth) so you can post and manage access.</li>
              <li>Basic authentication metadata (like user ID) required for login.</li>
              <li>Content you submit (logs/reports) and timestamps.</li>
              <li>Basic technical logs used for reliability and security (typical hosting/provider logs).</li>
            </ul>
          </div>

          <div className="border border-green-700/40 rounded-lg p-4 bg-black">
            <div className="text-xs text-green-200/70 mb-2">What we do not collect (on purpose)</div>
            <ul className="list-disc pl-5 text-sm text-green-200/80 grid gap-2">
              <li>We do not ask for your real name, address, phone number, or payment info.</li>
              <li>We do not sell your personal data.</li>
              <li>We do not claim to verify identities or “prove” who someone is in-game.</li>
            </ul>
          </div>

          <p className="text-xs text-green-400/70 leading-relaxed">
            You can request deletion of your account data by contacting the site admin (add your contact method later),
            but logs you posted may remain if needed for integrity/audit or to prevent abuse. (You can refine this policy.)
          </p>
        </section>

        <div className="my-6 border-t border-green-700/40" />

        {/* LIABILITY */}
        <section className="grid gap-3">
          <h2 className="text-green-200 text-lg">Limitation of Responsibility</h2>
          <p className="text-sm text-green-200/80 leading-relaxed">
            This site is provided “as-is.” We don’t guarantee accuracy of posts. Use your judgment.
            We aren’t responsible for decisions you make based on community submissions.
          </p>
        </section>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center border border-green-700/40 rounded px-3 py-2 text-sm hover:bg-green-900/20"
          >
            return to transmissions
          </Link>
        </div>
      </div>
    </main>
  );
}
