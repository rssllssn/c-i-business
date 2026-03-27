import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const displayName =
    user?.user_metadata?.full_name || user?.user_metadata?.username || "Signed in";

  return user ? (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">Signed in as</span>
      <span className="font-medium">{displayName}</span>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
