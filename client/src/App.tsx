import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import LocaleSuggestionBanner from "./components/LocaleSuggestionBanner";
import { LocaleProvider, useLocale } from "./contexts/LocaleContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Workspace from "./pages/Workspace";
import Settings from "./pages/Settings";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Landing} />
      <Route path={"/workspace"} component={Workspace} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LocaleProvider>
        <AppShell />
      </LocaleProvider>
    </ErrorBoundary>
  );
}

/** Remount routed UI when locale changes so dock titles and stale subtrees refresh. */
function AppShell() {
  const { resolvedLocale } = useLocale();

  return (
    <ThemeProvider key={resolvedLocale}>
      <TooltipProvider>
        <Toaster />
        <LocaleSuggestionBanner />
        <Router />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
