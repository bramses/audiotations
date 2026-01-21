import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { SettingsButton } from "./settings/settings-button";

export async function Header() {
  const session = await auth();

  return (
    <header
      className="border-b"
      style={{
        background: "var(--card)",
        borderColor: "var(--card-border)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-2xl tracking-wide hover:opacity-80 transition-opacity"
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              color: "var(--foreground)",
              fontWeight: 600,
            }}
          >
            Audiotations
          </Link>
          {session?.user && (
            <nav className="flex items-center gap-6">
              <Link
                href="/feed"
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: "var(--foreground-muted)" }}
              >
                Random Notes
              </Link>
            </nav>
          )}
        </div>
        {session?.user && (
          <div className="flex items-center gap-4">
            <span
              className="text-sm hidden sm:inline"
              style={{ color: "var(--foreground-muted)" }}
            >
              {session.user.email}
            </span>
            <SettingsButton />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: "var(--foreground-muted)" }}
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
