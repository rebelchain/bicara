import { loadBicaraDocs } from '@/lib/docs-loader';
import { loadMobileScaffoldFiles } from '@/lib/mobile-scaffold-loader';
import BicaraWorkbench from '@/components/BicaraWorkbench';

export default async function HomePage() {
  const [docs, mobileFiles] = await Promise.all([
    loadBicaraDocs(),
    loadMobileScaffoldFiles(),
  ]);
  return <BicaraWorkbench docs={docs} mobileFiles={mobileFiles} />;
}
