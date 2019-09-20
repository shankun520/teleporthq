import { ComponentPluginFactory, ComponentPlugin } from '@teleporthq/teleport-types'
import { ASTBuilders, ASTUtils } from '@teleporthq/teleport-shared'
import * as types from '@babel/types'

interface JSXHeadPluginConfig {
  componentChunkName?: string
  configTagIdentifier?: string
  configTagDependencyPath?: string
}

export const createPlugin: ComponentPluginFactory<JSXHeadPluginConfig> = (config) => {
  const {
    componentChunkName = 'jsx-component',
    configTagIdentifier = 'Helmet',
    configTagDependencyPath = 'react-helmet',
  } = config || {}

  const propTypesPlugin: ComponentPlugin = async (structure) => {
    const { uidl, chunks, dependencies } = structure

    const componentChunk = chunks.find((chunk) => chunk.name === componentChunkName)
    if (!componentChunk) {
      throw new Error(
        `JSX component chunk with name ${componentChunkName} was required and not found.`
      )
    }

    if (!uidl.seo) {
      return structure
    }

    const headASTTags = []

    if (uidl.seo.title) {
      const titleAST = ASTBuilders.createJSXTag('title')
      ASTUtils.addChildJSXText(titleAST, uidl.seo.title)
      headASTTags.push(titleAST)
    }

    if (uidl.seo.metaTags) {
      uidl.seo.metaTags.forEach((tag) => {
        const metaAST = ASTBuilders.createSelfClosingJSXTag('meta')
        Object.keys(tag).forEach((key) => {
          ASTUtils.addAttributeToJSXTag(metaAST, key, tag[key])
        })
        headASTTags.push(metaAST)
      })
    }

    if (uidl.seo.assets) {
      uidl.seo.assets.forEach((asset) => {
        // TODO: Handle other asset types when needed
        if (asset.type === 'canonical') {
          const canonicalLink = ASTBuilders.createSelfClosingJSXTag('link')
          ASTUtils.addAttributeToJSXTag(canonicalLink, 'rel', 'canonical')
          ASTUtils.addAttributeToJSXTag(canonicalLink, 'href', asset.path)
          headASTTags.push(canonicalLink)
        }
      })
    }

    if (headASTTags.length > 0) {
      const headConfigTag = ASTBuilders.createJSXTag(configTagIdentifier, headASTTags)

      const rootKey = uidl.node.content.key
      const rootElement = componentChunk.meta.nodesLookup[rootKey] as types.JSXElement

      // Head config added as the first child of the root element
      rootElement.children.unshift(headConfigTag)

      dependencies[configTagIdentifier] = {
        type: 'library',
        path: configTagDependencyPath,
      }
    }

    return structure
  }

  return propTypesPlugin
}

export default createPlugin()