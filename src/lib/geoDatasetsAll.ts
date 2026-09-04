import au from "./geoDatasets/au";
import ca from "./geoDatasets/ca";
import cn from "./geoDatasets/cn";
import jp from "./geoDatasets/jp";
import th from "./geoDatasets/th";
import tw from "./geoDatasets/tw";
import us from "./geoDatasets/us";
import { registerGeoDataset } from "./geoDatasetRegistry";

/**
 * Every country, registered at import.
 *
 * For the server and for tests, both of which want all seven at once and
 * neither of which ships a bundle to a browser. Importing this is what makes
 * `GEO_DATASETS` complete.
 *
 * Nothing under `src/app` that runs in a browser may import this, or the
 * splitting is undone in one line and nobody notices until the next time
 * somebody measures. `geoLazyLoading.test.ts` fails if one does.
 */
for (const dataset of [jp, us, ca, th, cn, au, tw]) registerGeoDataset(dataset);

export const GEO_DATASETS_ALL_LOADED = true;
