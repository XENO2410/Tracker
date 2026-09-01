import { Route, Routes } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import QuickLog from "@/pages/QuickLog";
import Workouts from "@/pages/Workouts";
import Body from "@/pages/Body";
import FoodMood from "@/pages/FoodMood";
import WeeklyReport from "@/pages/WeeklyReport";
import Profile from "@/pages/Profile";
import Products from "@/pages/Products";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="log" element={<QuickLog />} />
        <Route path="workouts" element={<Workouts />} />
        <Route path="body" element={<Body />} />
        <Route path="food" element={<FoodMood />} />
        <Route path="report" element={<WeeklyReport />} />
        <Route path="products" element={<Products />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
