import { createContext, useContext } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

export function useDatabaseSnapshot() {
  const data = useLiveQuery(
    () =>
      db.transaction(
        "r",
        [
          db.athletes,
          db.sessions,
          db.measurements,
          db.standards,
          db.archetypes,
          db.imports,
          db.settings,
        ],
        async () => {
          const [
            athletes,
            sessions,
            measurements,
            standards,
            archetypes,
            imports,
            settings,
          ] = await Promise.all([
            db.athletes.toArray(),
            db.sessions.toArray(),
            db.measurements.toArray(),
            db.standards.toArray(),
            db.archetypes.orderBy("priority").reverse().toArray(),
            db.imports.orderBy("importedAt").reverse().toArray(),
            db.settings.toArray(),
          ]);
          return {
            athletes,
            sessions,
            measurements,
            standards,
            archetypes,
            imports,
            settings,
            ready: true,
          };
        },
      ),
    [],
  );
  return (
    data ?? {
      athletes: [],
      sessions: [],
      measurements: [],
      standards: [],
      archetypes: [],
      imports: [],
      settings: [],
      ready: false,
    }
  );
}
export const DataContext = createContext<ReturnType<
  typeof useDatabaseSnapshot
> | null>(null);
export function useData() {
  const data = useContext(DataContext);
  if (!data) throw new Error("The assessment data provider is missing.");
  return data;
}
