import ArchetypeManager from "../components/ArchetypeManager";
import { PageHeader, Notice } from "../components/ui";
import { useData } from "../lib/useData";
export default function ComparisonsPage() {
  const { athletes, archetypes } = useData();
  return (
    <div className="page">
      <PageHeader
        eyebrow="Percentile context"
        title="Comparison groups"
        description="Define which athletes supply comparison results. Scoring profiles and point grades remain in Standards."
      />
      <Notice>
        Percentiles use valid published results from the exact standards version
        through the report date. Current roster tags determine group membership.
        These comparisons are local database observations, not population norms.
      </Notice>
      <ArchetypeManager athletes={athletes} archetypes={archetypes} />
    </div>
  );
}
