import { CommunicationsHub } from "../features/communications/communications-hub";

export default function NoticesScreen() {
  return <CommunicationsHub initialTab="notices" showBack={true} title="Notices" />;
}
