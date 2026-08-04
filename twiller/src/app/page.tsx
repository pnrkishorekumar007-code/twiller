import Landing from "@/components/Landing";
import Mainlayout from "@/components/layout/Mainlayout";
import { AuthProvider } from "@/context/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Home() {

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Mainlayout>
          {" "}
          <Landing />
        </Mainlayout>
      </AuthProvider>
    </ErrorBoundary>
  );
}
