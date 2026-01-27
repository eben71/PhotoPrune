import Image from 'next/image';

import type { PickerItem } from '../../src/types/phase2Envelope';

type SelectionSummaryProps = {
  selection: PickerItem[];
};

export function SelectionSummary({ selection }: SelectionSummaryProps) {
  const preview = selection.slice(0, 3);

  return (
    <section>
      <h2>Selection</h2>
      <p>{selection.length} items selected via Picker.</p>
      <div>
        {preview.map((item) => (
          <Image
            key={item.id}
            src={item.baseUrl}
            alt={item.filename}
            width={80}
            height={80}
          />
        ))}
      </div>
    </section>
  );
}
