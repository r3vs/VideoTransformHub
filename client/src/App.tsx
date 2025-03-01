import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/Dashboard";
import Course from "@/pages/Course";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

function ProtectedRoute(props: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0], { credentials: "include" });
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      } catch (error) {
        setLocation("/auth");
        return null;
      }
    },
  });

  if (isLoading) return null;
  if (!user) return <Redirect to="/auth" />;

  const Component = props.component;
  return (
    <div>
      <nav className="border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold">Learning Platform</h1>
          <Button
            variant="ghost"
            onClick={async () => {
              await apiRequest("POST", "/api/auth/logout");
              queryClient.clear();
              setLocation("/auth");
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>
      <Component />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route
        path="/courses/:id"
        component={() => <ProtectedRoute component={Course} />}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;