import ar from "./geoDatasets/ar";
import at from "./geoDatasets/at";
import au from "./geoDatasets/au";
import be from "./geoDatasets/be";
import br from "./geoDatasets/br";
import ca from "./geoDatasets/ca";
import ch from "./geoDatasets/ch";
import cl from "./geoDatasets/cl";
import cn from "./geoDatasets/cn";
import co from "./geoDatasets/co";
import de from "./geoDatasets/de";
import es from "./geoDatasets/es";
import fr from "./geoDatasets/fr";
import gb from "./geoDatasets/gb";
import ie from "./geoDatasets/ie";
import it from "./geoDatasets/it";
import jp from "./geoDatasets/jp";
import kr from "./geoDatasets/kr";
import mx from "./geoDatasets/mx";
import my from "./geoDatasets/my";
import nl from "./geoDatasets/nl";
import no from "./geoDatasets/no";
import nz from "./geoDatasets/nz";
import pe from "./geoDatasets/pe";
import ph from "./geoDatasets/ph";
import pl from "./geoDatasets/pl";
import ru from "./geoDatasets/ru";
import se from "./geoDatasets/se";
import th from "./geoDatasets/th";
import tw from "./geoDatasets/tw";
import us from "./geoDatasets/us";
import vn from "./geoDatasets/vn";
import { registerGeoDataset } from "./geoDatasetRegistry";

/**
 * Every country, registered at import.
 *
 * For the server and for tests, both of which want all of them at once and
 * neither of which ships a bundle to a browser. Importing this is what makes
 * `GEO_DATASETS` complete.
 *
 * Nothing under `src/app` that runs in a browser may import this, or the
 * splitting is undone in one line and nobody notices until the next time
 * somebody measures. `geoLazyLoading.test.ts` fails if one does.
 */
for (const dataset of [ar, at, au, be, br, ca, ch, cl, cn, co, de, es, fr, gb, ie, it, jp, kr, mx, my, nl, no, nz, pe, ph, pl, ru, se, th, tw, us, vn]) registerGeoDataset(dataset);

export const GEO_DATASETS_ALL_LOADED = true;
