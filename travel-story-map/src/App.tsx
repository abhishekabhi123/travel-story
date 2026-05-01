import "./App.css";
import MapView from "./components/MapView";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <div className="w-full h-screen">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#18181b",
            color: "#fff",
            border: "1px solid #27272a",
          },
        }}
      />
      <MapView />
    </div>
  );
}

export default App;
