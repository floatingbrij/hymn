import { useJamStore } from '../stores/jamStore';
import { JamLanding } from '../components/jam/JamLanding';
import { JamRoom } from '../components/jam/JamRoom';

export function JamPage() {
  const { isInJam } = useJamStore();

  if (isInJam) {
    return <JamRoom />;
  }

  return <JamLanding />;
}
