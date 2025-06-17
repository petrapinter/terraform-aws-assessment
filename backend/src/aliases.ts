import moduleAlias from 'module-alias';
import path from 'path';

// Register module aliases for path mapping
moduleAlias.addAliases({
  '@': path.join(__dirname)
});
