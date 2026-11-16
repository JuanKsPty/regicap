import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EntregarFeedbackPage } from '@/components/admin/entregar-feedback-page';

export const metadata: Metadata = { title: 'Entregar feedback' };
export default function Page() {
  return (
    <Suspense>
      <EntregarFeedbackPage />
    </Suspense>
  );
}
