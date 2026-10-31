import DataProvider from "./components/DataProvider";
import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
const CompareReportPage = lazy(() => import("./pages/CompareReportPage"));
const RosterReportPage = lazy(() => import("./pages/RosterReportPage"));
const ComparisonsPage = lazy(() => import("./pages/ComparisonsPage"));
import Shell from "./components/Shell";
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AthletesPage = lazy(() => import("./pages/AthletesPage"));
const AthletePage = lazy(() => import("./pages/AthletePage"));
const TestingPage = lazy(() => import("./pages/TestingPage"));
const NewSessionPage = lazy(() => import("./pages/NewSessionPage"));
const LiveTestingPage = lazy(() => import("./pages/LiveTestingPage"));
const ReviewSessionPage = lazy(() => import("./pages/ReviewSessionPage"));
const DatabasePage = lazy(() => import("./pages/DatabasePage"));
const StandardsPage = lazy(() => import("./pages/StandardsPage"));
const ReportingPage = lazy(() => import("./pages/ReportingPage"));
const AthleteReportPage = lazy(() => import("./pages/AthleteReportPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const RankingsPage = lazy(() => import("./pages/RankingsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

export default function App() {
  return (
    <DataProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<DashboardPage />} />
          <Route path="athletes" element={<AthletesPage />} />
          <Route path="athletes/:athleteId" element={<AthletePage />} />
          <Route path="testing" element={<TestingPage />} />
          <Route path="testing/new" element={<NewSessionPage />} />
          <Route path="testing/:sessionId/live" element={<LiveTestingPage />} />
          <Route
            path="testing/:sessionId/review"
            element={<ReviewSessionPage />}
          />
          <Route path="comparisons" element={<ComparisonsPage />} />
          <Route path="database" element={<DatabasePage />} />
          <Route path="standards" element={<StandardsPage />} />
          <Route path="reports/compare" element={<CompareReportPage />} />
          <Route path="reports/roster" element={<RosterReportPage />} />
          <Route path="reporting" element={<ReportingPage />} />
          <Route path="reporting/:athleteId" element={<AthleteReportPage />} />
          <Route path="rankings" element={<RankingsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}
