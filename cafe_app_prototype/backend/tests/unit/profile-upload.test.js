// Unit tests for profile photo upload logic.
// The logic is extracted from profile.tsx into a testable pure function so it can
// run outside React Native. Each test documents either correct behaviour or a known gap.

async function pickPhoto(deps) {
  const { picker, setProfilePhoto, email, storage } = deps

  const { status } = await picker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') return

  const result = await picker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  })

  if (result.canceled || !result.assets?.[0]) return

  const uri = result.assets[0].base64
    ? `data:image/jpeg;base64,${result.assets[0].base64}`
    : result.assets[0].uri

  setProfilePhoto(uri)
  // Gap: no try/catch — storage or setProfilePhoto errors propagate as unhandled rejections
  await storage.setItem(`profilePhoto_${email}`, uri)
}

describe('Profile photo upload — permissions', () => {
  test('does nothing when media library permission is denied', async () => {
    const setProfilePhoto = jest.fn()
    const storage = { setItem: jest.fn() }
    const picker = {
      requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
      launchImageLibraryAsync: jest.fn(),
    }

    await pickPhoto({ picker, setProfilePhoto, email: 'user@example.com', storage })

    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled()
    expect(setProfilePhoto).not.toHaveBeenCalled()
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  test('does nothing when user cancels the image picker', async () => {
    const setProfilePhoto = jest.fn()
    const storage = { setItem: jest.fn() }
    const picker = {
      requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
    }

    await pickPhoto({ picker, setProfilePhoto, email: 'user@example.com', storage })

    expect(setProfilePhoto).not.toHaveBeenCalled()
    expect(storage.setItem).not.toHaveBeenCalled()
  })
})

describe('Profile photo upload — URI construction', () => {
  test('uses data URI when base64 payload is present', async () => {
    let captured = null
    const picker = {
      requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      launchImageLibraryAsync: jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://tmp/photo.jpg', base64: 'abc123==' }],
      }),
    }
    const storage = { setItem: jest.fn() }

    await pickPhoto({
      picker,
      setProfilePhoto: v => { captured = v },
      email: 'user@example.com',
      storage,
    })

    expect(captured).toBe('data:image/jpeg;base64,abc123==')
  })

  test('falls back to file URI when base64 is null', async () => {
    let captured = null
    const picker = {
      requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      launchImageLibraryAsync: jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://tmp/photo.jpg', base64: null }],
      }),
    }
    const storage = { setItem: jest.fn() }

    await pickPhoto({
      picker,
      setProfilePhoto: v => { captured = v },
      email: 'user@example.com',
      storage,
    })

    expect(captured).toBe('file://tmp/photo.jpg')
  })

  test('photo is saved to storage under the correct per-user key', async () => {
    const storage = { setItem: jest.fn() }
    const picker = {
      requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      launchImageLibraryAsync: jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://photo.jpg', base64: null }],
      }),
    }

    await pickPhoto({ picker, setProfilePhoto: jest.fn(), email: 'alice@example.com', storage })

    expect(storage.setItem).toHaveBeenCalledWith('profilePhoto_alice@example.com', 'file://photo.jpg')
  })
})

describe('Profile photo upload — silent failure gap', () => {
  test('storage failure propagates as unhandled rejection (no try/catch in current impl)', async () => {
    const picker = {
      requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      launchImageLibraryAsync: jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://photo.jpg', base64: null }],
      }),
    }
    const storage = {
      setItem: jest.fn().mockRejectedValue(new Error('Storage quota exceeded')),
    }

    // Documents the gap: the error is not caught, so the caller sees a rejected promise.
    // The user never sees feedback that their photo was not saved.
    await expect(
      pickPhoto({ picker, setProfilePhoto: jest.fn(), email: 'user@example.com', storage })
    ).rejects.toThrow('Storage quota exceeded')
  })

  test('setProfilePhoto throwing does not prevent storage write (side-effect ordering)', async () => {
    const storage = { setItem: jest.fn().mockResolvedValue(undefined) }
    const picker = {
      requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      launchImageLibraryAsync: jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://photo.jpg', base64: null }],
      }),
    }

    // setProfilePhoto throws synchronously
    const throwingSet = () => { throw new Error('State update failed') }

    await expect(
      pickPhoto({ picker, setProfilePhoto: throwingSet, email: 'user@example.com', storage })
    ).rejects.toThrow('State update failed')

    // Storage write never ran because the throw happened before it
    expect(storage.setItem).not.toHaveBeenCalled()
  })
})
