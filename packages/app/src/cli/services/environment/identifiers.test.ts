import {ensureDeploymentIdsPresence} from './identifiers'
import {fetchAppExtensionRegistrations} from '../dev/fetch'
import {createExtension, ExtensionRegistration} from '../dev/create-extension'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {App, UIExtension} from 'cli/models/app/app'

beforeEach(() => {
  vi.mock('@shopify/cli-kit', async () => {
    const cliKit: any = await vi.importActual('@shopify/cli-kit')
    return {
      ...cliKit,
      session: {
        ensureAuthenticatedPartners: async () => 'token',
      },
    }
  })
  vi.mock('../dev/fetch')
  vi.mock('../dev/create-extension')
})

const REGISTRATION_A: ExtensionRegistration = {
  uuid: 'UUID_A',
  id: 'A',
  title: 'A',
  type: 'CHECKOUT_POST_PURCHASE',
}

const REGISTRATION_A_2 = {
  uuid: 'UUID_A_2',
  id: 'A_2',
  title: 'A_2',
  type: 'CHECKOUT_POST_PURCHASE',
}

const REGISTRATION_B = {
  uuid: 'UUID_B',
  id: 'B',
  title: 'B',
  type: 'SUBSCRIPTION_MANAGEMENT',
}

const REGISTRATION_C = {
  uuid: 'UUID_C',
  id: 'C',
  title: 'C',
  type: 'THEME_APP_EXTENSION',
}

const REGISTRATION_D = {
  uuid: 'UUID_D',
  id: 'D',
  title: 'D',
  type: 'BEACON_EXTENSION',
}

const EXTENSION_A: UIExtension = {
  idEnvironmentVariableName: 'EXTENSION_A_ID',
  localIdentifier: 'EXTENSION_A',
  configurationPath: '',
  directory: '',
  type: 'checkout_post_purchase',
  graphQLType: 'CHECKOUT_POST_PURCHASE',
  configuration: {name: '', type: 'checkout_post_purchase', metafields: []},
  buildDirectory: '',
  entrySourceFilePath: '',
}

const EXTENSION_A_2: UIExtension = {
  idEnvironmentVariableName: 'EXTENSION_A_2_ID',
  localIdentifier: 'EXTENSION_A_2',
  configurationPath: '',
  directory: '',
  type: 'checkout_post_purchase',
  graphQLType: 'CHECKOUT_POST_PURCHASE',
  configuration: {name: '', type: 'checkout_post_purchase', metafields: []},
  buildDirectory: '',
  entrySourceFilePath: '',
}

const EXTENSION_B: UIExtension = {
  idEnvironmentVariableName: 'EXTENSION_B_ID',
  localIdentifier: 'EXTENSION_B',
  configurationPath: '',
  directory: '',
  type: 'product_subscription',
  graphQLType: 'SUBSCRIPTION_MANAGEMENT',
  configuration: {name: '', type: 'checkout_post_purchase', metafields: []},
  buildDirectory: '',
  entrySourceFilePath: '',
}

const EXTENSION_C: UIExtension = {
  idEnvironmentVariableName: 'EXTENSION_C_ID',
  localIdentifier: 'EXTENSION_C',
  configurationPath: '',
  directory: '',
  type: 'theme',
  graphQLType: 'THEME_APP_EXTENSION',
  configuration: {name: '', type: 'checkout_post_purchase', metafields: []},
  buildDirectory: '',
  entrySourceFilePath: '',
}

const EXTENSION_D: UIExtension = {
  idEnvironmentVariableName: 'EXTENSION_D_ID',
  localIdentifier: 'EXTENSION_D',
  configurationPath: '',
  directory: '',
  type: 'beacon_extension',
  graphQLType: 'BEACON_EXTENSION',
  configuration: {name: '', type: 'checkout_post_purchase', metafields: []},
  buildDirectory: '',
  entrySourceFilePath: '',
}

const LOCAL_APP = (extensions: UIExtension[]): App => {
  return {
    name: 'my-app',
    idEnvironmentVariableName: 'SHOPIFY_APP_ID',
    directory: '/app',
    dependencyManager: 'yarn',
    configurationPath: '/shopify.app.toml',
    configuration: {scopes: 'read_products'},
    webs: [],
    nodeDependencies: {},
    environment: {
      dotenv: {},
      env: {},
    },
    extensions: {ui: extensions, theme: [], function: []},
  }
}

const options = (extensions: UIExtension[], identifiers: any = {}) => {
  return {
    app: LOCAL_APP(extensions),
    token: 'token',
    appId: 'appId',
    envIdentifiers: {extensions: identifiers},
  }
}

describe('ensureDeploymentIdsPresence: case 1 no local nor remote extensions', () => {
  it('throw a nothing to deploy error', async () => {
    // Given
    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValueOnce({app: {extensionRegistrations: []}})

    // When
    const got = ensureDeploymentIdsPresence(options([]))

    // Then
    await expect(got).rejects.toThrow('There are no extensions to deploy')
  })
})

describe('ensureDeploymentIdsPresence: case 2 no local extension, some remote', () => {
  it('throw a nothing to deploy error', async () => {
    // Given
    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValueOnce({app: {extensionRegistrations: [REGISTRATION_A]}})

    // When
    const got = ensureDeploymentIdsPresence(options([]))

    // Then
    await expect(got).rejects.toThrow('There are no extensions to deploy')
  })
})

describe('ensureDeploymentIdsPresence: case 3 some local extensions, no remote ones', () => {
  it('success and creates all local extensions', async () => {
    // Given
    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValueOnce({app: {extensionRegistrations: []}})
    vi.mocked(createExtension).mockResolvedValueOnce(REGISTRATION_A)
    vi.mocked(createExtension).mockResolvedValueOnce(REGISTRATION_B)

    // When
    const got = await ensureDeploymentIdsPresence(options([EXTENSION_A, EXTENSION_B]))

    // Then
    expect(createExtension).toBeCalledTimes(2)
    expect(got).toEqual({app: 'appId', extensions: {EXTENSION_A: 'UUID_A', EXTENSION_B: 'UUID_B'}})
  })
})

describe('ensureDeploymentIdsPresence: case 4 same number of extensions local and remote with matching types', () => {
  it('suceeds automatically', async () => {
    // Given
    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValueOnce({
      app: {extensionRegistrations: [REGISTRATION_A, REGISTRATION_B]},
    })

    // When
    const got = await ensureDeploymentIdsPresence(options([EXTENSION_A, EXTENSION_B]))

    // Then
    expect(createExtension).not.toBeCalled()
    expect(got).toEqual({app: 'appId', extensions: {EXTENSION_A: 'UUID_A', EXTENSION_B: 'UUID_B'}})
  })
})

describe('ensureDeploymentIdsPresence: case 5 more extensions local than remote, all remote match some local', () => {
  it('suceeds and creates missing extensions', async () => {
    // Given
    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValueOnce({
      app: {extensionRegistrations: [REGISTRATION_A, REGISTRATION_B]},
    })
    vi.mocked(createExtension).mockResolvedValueOnce(REGISTRATION_C)
    vi.mocked(createExtension).mockResolvedValueOnce(REGISTRATION_D)

    // When
    const got = await ensureDeploymentIdsPresence(options([EXTENSION_A, EXTENSION_B, EXTENSION_C, EXTENSION_D]))

    // Then
    expect(createExtension).toBeCalledTimes(2)
    expect(got).toEqual({
      app: 'appId',
      extensions: {EXTENSION_A: 'UUID_A', EXTENSION_B: 'UUID_B', EXTENSION_C: 'UUID_C', EXTENSION_D: 'UUID_D'},
    })
  })
})

describe('ensureDeploymentIdsPresence: case 6 remote extensions have types not present locally', () => {
  it('throw error, invalid local environment', async () => {
    // Given
    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValueOnce({
      app: {extensionRegistrations: [REGISTRATION_C, REGISTRATION_D]},
    })

    // When
    const got = ensureDeploymentIdsPresence(options([EXTENSION_A, EXTENSION_B]))

    // Then
    await expect(got).rejects.toThrow("We couldn't automatically match your local and remote extensions")
  })
})

describe('ensureDeploymentIdsPresence: case 7 some extensions match, but other are missing', () => {
  it('throw error, invalid local environment', async () => {
    // Given
    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValueOnce({
      app: {extensionRegistrations: [REGISTRATION_A, REGISTRATION_C]},
    })

    // When
    const got = ensureDeploymentIdsPresence(options([EXTENSION_A, EXTENSION_B]))

    // Then
    await expect(got).rejects.toThrow("We couldn't automatically match your local and remote extensions")
  })
})

describe('ensureDeploymentIdsPresence: case 8 multiple extensions of the same type locally and remotely', () => {
  it('throw a needs manual match error', async () => {
    // Given
    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValueOnce({
      app: {extensionRegistrations: [REGISTRATION_A, REGISTRATION_A_2]},
    })

    // When
    const got = ensureDeploymentIdsPresence(options([EXTENSION_A, EXTENSION_A_2]))

    // Then
    expect(createExtension).not.toBeCalled()
    await expect(got).rejects.toThrow('Manual matching is required')
  })
})

describe('ensureDeploymentIdsPresence: case 9 multiple extensions of the same type locally and remotely, others can be matched', () => {
  it('throw a needs manual match error', async () => {
    // Given
    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValueOnce({
      app: {extensionRegistrations: [REGISTRATION_A, REGISTRATION_A_2]},
    })
    vi.mocked(createExtension).mockResolvedValueOnce(REGISTRATION_B)

    // When
    const got = ensureDeploymentIdsPresence(options([EXTENSION_A, EXTENSION_A_2, EXTENSION_B]))

    // Then
    await expect(got).rejects.toThrow('Manual matching is required')
    expect(createExtension).toBeCalledTimes(1)
  })
})

describe('ensureDeploymentIdsPresence: case 10 there are more remote than local extensions', () => {
  it('throw error, invalid local environment', async () => {
    // Given
    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValueOnce({
      app: {extensionRegistrations: [REGISTRATION_A, REGISTRATION_A_2]},
    })

    // When
    const got = ensureDeploymentIdsPresence(options([EXTENSION_A]))

    // Then
    await expect(got).rejects.toThrow('This app has 2 registered extensions, but only 1 are locally available.')
  })
})

describe('ensureDeploymentIdsPresence: case 11 some extension have uuid, others can be matched', () => {
  it('suceeds automatically', async () => {
    // Given
    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValueOnce({
      app: {extensionRegistrations: [REGISTRATION_A, REGISTRATION_B]},
    })

    // When
    const got = await ensureDeploymentIdsPresence(options([EXTENSION_A, EXTENSION_B], {EXTENSION_A: 'UUID_A'}))

    // Then
    expect(createExtension).not.toBeCalled()
    expect(got).toEqual({app: 'appId', extensions: {EXTENSION_A: 'UUID_A', EXTENSION_B: 'UUID_B'}})
  })
})

describe("ensureDeploymentIdsPresence: case 12 some extension have uuid, but doesn't match a remote one", () => {
  it('suceeds rematching the extension to the correct UUID if the type is valid', async () => {
    // Given
    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValueOnce({
      app: {extensionRegistrations: [REGISTRATION_A, REGISTRATION_B]},
    })

    // When
    const got = await ensureDeploymentIdsPresence(options([EXTENSION_A, EXTENSION_B], {EXTENSION_A: 'UUID_WRONG'}))

    // Then
    expect(createExtension).not.toBeCalled()
    expect(got).toEqual({app: 'appId', extensions: {EXTENSION_A: 'UUID_A', EXTENSION_B: 'UUID_B'}})
  })
})

describe('ensureDeploymentIdsPresence: case 13 duplicated extension types but some of them already matched', () => {
  it('suceeds matching the other extensions', async () => {
    // Given
    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValueOnce({
      app: {extensionRegistrations: [REGISTRATION_A, REGISTRATION_A_2, REGISTRATION_B]},
    })

    // When
    const got = await ensureDeploymentIdsPresence(
      options([EXTENSION_A, EXTENSION_A_2, EXTENSION_B], {EXTENSION_A: 'UUID_A'}),
    )

    // Then
    expect(createExtension).not.toBeCalled()
    expect(got).toEqual({
      app: 'appId',
      extensions: {EXTENSION_A: 'UUID_A', EXTENSION_A_2: 'UUID_A_2', EXTENSION_B: 'UUID_B'},
    })
  })
})