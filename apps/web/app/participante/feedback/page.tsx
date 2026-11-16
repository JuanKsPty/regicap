import type { Metadata } from 'next';
import { RecibirFeedbackPage } from '@/components/feedback/recibir-feedback-page';

export const metadata: Metadata = { title: 'Revisar feedback' };
export default function Page() {
  return <RecibirFeedbackPage />;
}
