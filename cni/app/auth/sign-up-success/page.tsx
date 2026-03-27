import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Your account is ready</CardTitle>
              <CardDescription>Use your username to sign in</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                You&apos;ve successfully signed up. Go back to the login screen and sign in with your username and password.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
