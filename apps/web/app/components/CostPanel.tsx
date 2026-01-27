import type { RunEnvelope } from '../../src/types/phase2Envelope';
import { Banner } from './Banner';

type CostPanelProps = {
  telemetry: RunEnvelope['telemetry'] | null;
};

export function CostPanel({ telemetry }: CostPanelProps) {
  if (!telemetry) {
    return (
      <section>
        <h2>Cost summary</h2>
        <p>No cost data yet.</p>
      </section>
    );
  }

  const { cost, warnings } = telemetry;
  const nearSoftCap =
    cost.softCapUnits > 0 &&
    cost.estimatedUnits >= cost.softCapUnits * 0.8 &&
    !cost.hitSoftCap;

  return (
    <section>
      <h2>Cost summary</h2>
      <ul>
        <li>API calls: {cost.apiCalls}</li>
        <li>Estimated units: {cost.estimatedUnits}</li>
        <li>Soft cap: {cost.softCapUnits}</li>
        <li>Hard cap: {cost.hardCapUnits}</li>
      </ul>
      {nearSoftCap ? (
        <Banner tone="warn" title="Approaching soft cap">
          Usage is nearing the soft cap. Consider trimming your selection if
          needed.
        </Banner>
      ) : null}
      {cost.hitSoftCap ? (
        <Banner tone="warn" title="Soft cap reached">
          Approaching the soft cap. Results may be limited if you continue.
        </Banner>
      ) : null}
      {cost.hitHardCap ? (
        <Banner tone="error" title="Hard cap reached">
          Processing stopped early; results may be partial.
        </Banner>
      ) : null}
      {warnings.length > 0 ? (
        <ul>
          {warnings.map((warning) => (
            <li key={`${warning.code}-${warning.message}`}>
              {warning.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
