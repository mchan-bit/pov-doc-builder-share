import { capraTokenPostcssPlugin } from '@capra/dx-tokens-postcss-plugin'
import { allTokens } from '@capra/theme/dx/tokens-minimal'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default {
  plugins: [tailwindcss(), autoprefixer(), capraTokenPostcssPlugin({ tokens: allTokens })],
}
