// These types are specific to this client library, not to Direct Line 3.0

export enum ConnectionStatus {
    Uninitialized,              // the status when the DirectLine object is first created/constructed
    Connecting,                 // currently trying to connect to the conversation
    Online,                     // successfully connected to the conversation. Connection is healthy so far as we know.
    ExpiredToken,               // last operation errored out with an expired token. Possibly waiting for someone to supply a new one.
    FailedToConnect,            // the initial attempt to connect to the conversation failed. No recovery possible.
    Ended                       // the bot ended the conversation
}
