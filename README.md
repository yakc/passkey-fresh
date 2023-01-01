# passkey-fresh

A skeleton [Fresh](https://fresh.deno.dev/) webapp using Passkeys for
authentication, running on Deno.

### What's in the box

This builds on [Fido2](https://deno.land/x/fido2) to fully support Passkeys.
(Other flavors of Webauthn might work, but that would just be lucky
coincidence.) The missing pieces are:

- `Marshaller`: a bunch of byte arrays go back and forth over the wire, so this
  is a way to express and embody such structures. The primary use is for the
  _challenge_, some random bytes that are to be encrypted with a private key on
  the client browser.

- `SessionCookie` enables stateless sessions, where all of the session data is
  held in an encrypted client-side cookie. They obviate sticky server-side
  sessions, and enable horizontal scaling by allowing any mix of multiple server
  instances to handle a series of requests from individual users. To verify
  registration and authentication, the encrypted _challenge_ is decrypted on the
  server with a public key and compared against the plaintext that was
  originally sent to the client. The session holds that plaintext. But wait, the
  session data is also stored on the client. That's OK because the session data
  is encrypted, so it is impractical to tamper with it.

- `CredStore`: the cookie encryption key, each user's public key, and some other
  bits have to be stored somewhere. Deno
  [supports `LocalStorage`](https://deno.land/manual/runtime/web_storage_api) on
  the server; the strings get stashed
  [somewhere](https://stackoverflow.com/a/73996356/144244). This is suitable for
  development, or when hosting a single durable container. It won't work with
  horizontally scaled and/or ephemeral instances. It's not available with Deno
  Deploy. Therefore, a pluggable interface is defined; but no known alternatives
  exist yet.

### Passkeys not passwords

Registration with passwords is familiar.

1. When first arriving to a site that requires login, you are prompted to login
   or sign up.

2. To sign up, you enter a username/email and password.

   - An email is a self-regulating unique identifier and a way to contact you
     should you need to reset your password. A check is made to see if it is
     already in use.

   - Your name acts as a "display name", for the site to call you by name.

   - You may be prompted to enter a password separately.

3. The site creates an account with these details, and you are logged in as a
   result.

   - The password should be salted and hashed for storage, but if someone gets
     the password file, they can eventually brute-force it, and that will reveal
     the plaintext of the password, which you may be using in other sites.

Your login state is embodied in a cookie, which will be sent with any (and
every) request to the site. If you do not logout manually, eventually your
session will expire.

1. When arriving to a site that requires login, you are prompted to login or
   sign up.

2. To login, you enter a username/email and password.

   - You may be prompted to enter a password separately.

3. The site applies the same password hashing operation and compares it with the
   stored value. If it matches, you are logged in.

   - To avoid account enumeration, if the user/pass combo does not work for any
     reason, the site can only report to you that the login failed, but not why.
     (It can be more specific in the server logs.)

4. The login UI also includes a "Forgot password" link. Clicking it prompts you
   for an email address. Submitting will return a message like, "If there is an
   account with this email, you'll get receive a time-sensitive single-use link
   that will prompt for a new password."

   - To avoid account enumeration, the message does not change if there is no
     account with that email. No email-with-link is sent. The attempt should be
     logged.

   - This requires an email service, which is a whole 'nother discussion.

These password operations require a few short user-provided strings, simple HTML
controls, and no JavaScript. For Passkeys

1. When first arriving to a site that requires a Passkey, you are prompted to
   authenticate or register.

2. To register, you enter a username/email.

   - An email is useful in the same way, as uniquely identifying and a means of
     contact.

   - Your name acts as a "display name", for the site to call you by name.

3. Clicking the Register button executes JavaScript that takes server-generated
   _attestation_ data -- "this is me" -- and amends it with the email and/or
   username entered, along with a derived _userHandle_, an opaque identifier.

4. The JavaScript calls `navigator.credentials.create` with the data, which
   opens browser-specific UI that prompts for biometric verification. Successful
   verification then

   - generates a private/public key pair

   - does a crypto operation on the _challenge_ with the private key

   - generates a response, bundling the request with the results, including the
     public key

   - saves the key pair using the email (or whatever was entered there) as an
     identifier for recall later

5. The attestion response is sent to the server.

   - The previously stored _challenge_ is retrieved, and a reverse crypto
     operation is performed using the received public key. If the results match,
     then the server knows it has a valid public key, which can be associated
     with the _userHandle_.

   - An account is created with the user details and public key, and the user is
     registered and active.

You Passkey session will eventually expire.

1. When arriving to a site that requires a Passkey, you are prompted to
   authenticate or register.

2. You do not need to enter a username/email, because the browser tracks the
   Passkeys you create for each domain. This is similar to how a password
   manager suggests usernames, but with Passkeys, it's more than a suggestion
   because the Passkey only works on specific sites; if you don't have one
   there, you can't go further.

3. Clicking the Authenticate button executes JavaScript that takes
   server-generated _assertion_ data -- "is this you?" -- and passes it to
   `navigator.credentials.get`, which opens browser-specific UI that prompts for
   biometric verification. (If you created more than one Passkey for the domain,
   you will be prompted to choose by username/email.) Successful verification
   returns an assertion response generated with the private key, and the
   response contains the _userHandle_ that owns the Passkey.

4. The assertion response is sent to the server.

   - The server finds the account by _userHandle_ to get their public key.

   - A reverse crypto operation attempts to match.

   - A match means the user has successfully authenticated.

5. In theory, an "I lost my biometric device" link could send a reset link to
   the user's email (if their account identifier is an email, or the acccount
   info has an email), which would allow them to create a new Passkey for an
   existing account.

### Development

Written on macOS Monterey (12.6.1) with Safari 16.0. Passkey support is not
fully baked -- there is no obvious way to delete a Passkey, for example. The
situation should be better in Ventura (macOS 13).

### Usage

Start the project:

```
deno task start
```

This will watch the project directory and restart as necessary.
