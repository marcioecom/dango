use serde::Serialize;

const SERVICE: &str = "com.leapstark.dango";
const ACCOUNT: &str = "desktop-session";

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum KeychainError {
    Unavailable,
}

trait SessionTokenStore {
    fn delete(&self) -> Result<(), KeychainError>;
    fn load(&self) -> Result<Option<String>, KeychainError>;
    fn save(&self, token: &str) -> Result<(), KeychainError>;
}

#[cfg(target_os = "macos")]
struct SystemKeychain;

#[cfg(target_os = "macos")]
impl SystemKeychain {
    fn entry(&self) -> Result<keyring::v1::Entry, KeychainError> {
        keyring::v1::Entry::new(SERVICE, ACCOUNT).map_err(|_| KeychainError::Unavailable)
    }
}

#[cfg(target_os = "macos")]
impl SessionTokenStore for SystemKeychain {
    fn delete(&self) -> Result<(), KeychainError> {
        match self.entry()?.delete_credential() {
            Ok(()) | Err(keyring::v1::Error::NoEntry) => Ok(()),
            Err(_) => Err(KeychainError::Unavailable),
        }
    }

    fn load(&self) -> Result<Option<String>, KeychainError> {
        match self.entry()?.get_password() {
            Ok(token) => Ok(Some(token)),
            Err(keyring::v1::Error::NoEntry) => Ok(None),
            Err(_) => Err(KeychainError::Unavailable),
        }
    }

    fn save(&self, token: &str) -> Result<(), KeychainError> {
        self.entry()?
            .set_password(token)
            .map_err(|_| KeychainError::Unavailable)
    }
}

#[cfg(not(target_os = "macos"))]
struct SystemKeychain;

#[cfg(not(target_os = "macos"))]
impl SessionTokenStore for SystemKeychain {
    fn delete(&self) -> Result<(), KeychainError> {
        Err(KeychainError::Unavailable)
    }

    fn load(&self) -> Result<Option<String>, KeychainError> {
        Err(KeychainError::Unavailable)
    }

    fn save(&self, _token: &str) -> Result<(), KeychainError> {
        Err(KeychainError::Unavailable)
    }
}

fn delete_from(store: &impl SessionTokenStore) -> Result<(), KeychainError> {
    store.delete()
}

fn load_from(store: &impl SessionTokenStore) -> Result<Option<String>, KeychainError> {
    store.load()
}

fn save_to(store: &impl SessionTokenStore, token: &str) -> Result<(), KeychainError> {
    if token.is_empty() {
        return Err(KeychainError::Unavailable);
    }
    store.save(token)
}

#[tauri::command]
pub fn delete_session_token() -> Result<(), KeychainError> {
    delete_from(&SystemKeychain)
}

#[tauri::command]
pub fn load_session_token() -> Result<Option<String>, KeychainError> {
    load_from(&SystemKeychain)
}

#[tauri::command]
pub fn save_session_token(token: &str) -> Result<(), KeychainError> {
    save_to(&SystemKeychain, token)
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use super::*;

    #[derive(Default)]
    struct MemoryStore(Mutex<Option<String>>);

    impl SessionTokenStore for MemoryStore {
        fn delete(&self) -> Result<(), KeychainError> {
            *self.0.lock().unwrap() = None;
            Ok(())
        }

        fn load(&self) -> Result<Option<String>, KeychainError> {
            Ok(self.0.lock().unwrap().clone())
        }

        fn save(&self, token: &str) -> Result<(), KeychainError> {
            *self.0.lock().unwrap() = Some(token.to_owned());
            Ok(())
        }
    }

    #[test]
    fn stores_loads_and_deletes_a_session() {
        let store = MemoryStore::default();

        save_to(&store, "session-token").unwrap();
        assert_eq!(load_from(&store).unwrap(), Some("session-token".to_owned()));

        delete_from(&store).unwrap();
        assert_eq!(load_from(&store).unwrap(), None);
    }

    #[test]
    fn refuses_an_empty_token() {
        let store = MemoryStore::default();
        assert_eq!(save_to(&store, ""), Err(KeychainError::Unavailable));
    }
}
