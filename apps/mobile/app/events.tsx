import { CommunicationsHub } from "../features/communications/communications-hub";

export default function EventsScreen() {
  return <CommunicationsHub initialTab="events" showBack={true} title="Events" />;
}
