/**
 * Act I — The Threshold (Gateway)
 * ================================
 * Wrapper section that renders the Gatekeeper component.
 * The Gatekeeper owns all Act I logic — identity check,
 * password gate, audio, preloading, and the exhale transition.
 */

import Gatekeeper from '../components/Gatekeeper';

interface Props {
  isActive: boolean;
  onAuthenticated: () => void;
}

export default function ActIThreshold({ onAuthenticated }: Props) {
  return <Gatekeeper onAuthenticated={onAuthenticated} />;
}
