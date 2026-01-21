import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { SettingsButton } from "./settings/settings-button";

export async function Header() {
  const session = await auth();

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
            Audiotations
          </Link>
          {session?.user && (
            <Link
              href="/feed"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Random Notes
            </Link>
          )}
        </div>
        {session?.user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">{session.user.email}</span>
            <SettingsButton />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
