import { datasetInfo } from '../domain/analytics';
export function Health() {
  return (
    <main className="health-page">
      <span className="data-chip">HEALTHY</span>
      <h1>Executive Analytics is ready</h1>
      <p>
        Dataset {datasetInfo.version} contains {datasetInfo.factCount} synthetic facts from{' '}
        {datasetInfo.start} through {datasetInfo.end}.
      </p>
      <a href="./">Open Executive Analytics</a>
    </main>
  );
}
