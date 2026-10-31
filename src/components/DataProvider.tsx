import type { ReactNode } from "react";
import { DataContext, useDatabaseSnapshot } from "../lib/useData";
export default function DataProvider({ children }: { children: ReactNode }) {
  const data = useDatabaseSnapshot();
  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}
