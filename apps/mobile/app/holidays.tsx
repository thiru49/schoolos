import { CommunicationsHub } from "../features/communications/communications-hub";

export default function HolidaysScreen() {
  return <CommunicationsHub initialTab="holidays" showBack={true} title="Holidays" />;
}
