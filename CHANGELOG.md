# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

<!-- CHANGELOG line template
### Added/Changed/Removed
- Added something, by [@johndoe](https://github.com/johndoe), in PR [#XXX](https://github.com/microsoft/BotFramework-DirectLineJS/pull/XXX)
### Changed (for dependency bumps)
- `core`: Bumps to [`abc@1.2.3`](https://npmjs.com/package/abc/), in PR [#XXX](https://github.com/microsoft/BotFramework-DirectLineJS/pull/XXX)
### Fixed
- Fix [#XXX](https://github.com/microsoft/BotFramework-DirectLineJS/issues/XXX). Patched something, by [@johndoe](https://github.com/johndoe) in PR [#XXX](https://github.com/microsoft/BotFramework-DirectLineJS/pull/XXX)
-->

## [Unreleased]

- Update DirectLine to rxjs v6 pipeable operators, PR [#102](https://github.com/microsoft/BotFramework-DirectLineJS/pull/102/files)

## [0.14.1] - 2021-02-10

### Changed

- Bumped [`botframework-streaming@4.11.0`](https://npmjs.com/package/botframework-streaming), by [@stevengum](https://github.com/stevengum), in PR [#323](https://github.com/microsoft/BotFramework-DirectLineJS/pull/323)

## [0.14.0] - 2021-02-09

### Added

- Create better handling of Web Socket errors, by [@compulim](https://github.com/compulim), in PR [#324](https://github.com/microsoft/BotFramework-DirectLineJS/pull/324)
- Added `setUserId()` function to set user ID before connection, by [@timenick](https://github.com/timenick), in PR [#316](https://github.com/microsoft/BotFramework-DirectLineJS/pull/316)

## [0.13.1] - 2020-09-09

### Changed

- Bumped [`botframework-streaming@4.10.3`](https://npmjs.com/package/botframework-streaming), by [@stevengum](https://github.com/stevengum), in PR [#308](https://github.com/microsoft/BotFramework-DirectLineJS/pull/308)

## [0.13.0] - 2020-08-17

### Added

- Added `conversationStartProperties` and `locale`, by [@timenick](https://github.com/timenick), in PR [#293](https://github.com/microsoft/BotFramework-DirectLineJS/pull/293)

### Fixed

- Fixed [#287](https://github.com/microsoft/BotFramework-DirectLineJS/issues/287), removed `x-ms-bot-id` header, by [@swagatmishra2007](https://github.com/swagatmishra2007), in PR [#296](https://github.com/microsoft/BotFramework-DirectLineJS/pull/296)

## [0.12.0] - 2020-06-04

### Added

- Added support of Direct Line App Service Extension, by [@ckkashyap](https://github.com/ckkashyap), in PR [#183](https://github.com/microsoft/BotFramework-DirectLineJS/pull/183) and [#274](https://github.com/microsoft/BotFramework-DirectLineJS/pull/274)
- Added support for `Retry-After` header and version information to `x-ms-bot-agent` header, by [@swagatmishra2007](https://github.com/swagatmishra2007), in PR [#247](https://github.com/microsoft/BotFramework-DirectLineJS/pull/247)
   - Also improved testability of the package

### Changed

- Lock down on version of dependencies, by [@compulim](https://github.com/compulim), in PR [#280](https://github.com/microsoft/BotFramework-DirectLineJS/pull/280)
   - [`rxjs@5.5.10`](https://npmjs.com/package/rxjs)
      - This version is selected out of the previous commit of `package-lock.json`
- Bumped [`botframework-streaming@4.9.2`](https://npmjs.com/package/botframework-streaming), by [@compulim](https://github.com/compulim), in PR [#285](https://github.com/microsoft/BotFramework-DirectLineJS/pull/285)

## [0.11.6] - 2019-10-25

### Fixed

- Reverting PR [#171](https://github.com/microsoft/BotFramework-DirectLineJS/pull/171) and PR [#172](https://github.com/microsoft/BotFramework-DirectLineJS/pull/172), which caused infinite loop of reconnections, by [@compulim](https://github.com/compulim) in PR [#240](https://github.com/microsoft/BotFramework-DirectLineJS/pull/240)

## [0.11.5] - 2019-09-30

### Breaking Changes

- Build folders updated
   - `/dist/` contains JavaScript bundle
       - `/dist/directline.js` is now in lowercase
   - `/lib/` contains ES modules and type definitions
- Build scripts updated
   - `npm run build`: Development build, with instrumentation code, one-off
   - `npm run start`: Development build, with instrumentation code, with watch
   - `npm run prepublishOnly`: Production build, minified, one-off

### Changed
- Bumped dependencies, by [@compulim](https://github.com/compulim), in PR [#195](https://github.com/microsoft/BotFramework-DirectLineJS/pull/195)
   - [`@babel/runtime@7.6.0`](https://npmjs.com/package/@babel/runtime)
   - [`rxjs@5.0.3`](https://npmjs.com/package/rxjs)
- Bumped dev dependencies, by [@compulim](https://github.com/compulim), in PR [#195](https://github.com/microsoft/BotFramework-DirectLineJS/pull/195)
   - [`@babel/cli@7.6.0`](https://npmjs.com/package/@babel/cli)
   - [`@babel/core@7.6.0`](https://npmjs.com/package/@babel/core)
   - [`@babel/plugin-proposal-class-properties@7.5.5`](https://npmjs.com/package/@babel/plugin-proposal-class-properties)
   - [`@babel/plugin-proposal-object-rest-spread@7.5.5`](https://npmjs.com/package/@babel/plugin-proposal-object-rest-spread)
   - [`@babel/plugin-transform-runtime@7.6.0`](https://npmjs.com/package/@babel/plugin-transform-runtime)
   - [`@babel/preset-env@7.6.0`](https://npmjs.com/package/@babel/preset-env)
   - [`@babel/preset-typescript@7.6.0`](https://npmjs.com/package/@babel/preset-typescript)
   - [`@types/jest@24.0.18`](https://npmjs.com/package/@types/jest)
   - [`@types/node@12.7.4`](https://npmjs.com/package/@types/node)
   - [`@types/p-defer@2.0.0`](https://npmjs.com/package/@types/p-defer)
   - [`babel-jest@24.9.0`](https://npmjs.com/package/babel-jest)
   - [`babel-plugin-istanbul@5.2.0`](https://npmjs.com/package/babel-plugin-istanbul)
   - [`babel-plugin-transform-inline-environment-variables@0.4.3`](https://npmjs.com/package/babel-plugin-transform-inline-environment-variables)
   - [`concurrently@4.1.2`](https://npmjs.com/package/concurrently)
   - [`dotenv@8.1.0`](https://npmjs.com/package/dotenv)
   - [`get-port@5.0.0`](https://npmjs.com/package/get-port)
   - [`global-agent@2.0.2`](https://npmjs.com/package/global-agent)
   - [`http-proxy@1.17.0`](https://npmjs.com/package/http-proxy)
   - [`jest@24.9.0`](https://npmjs.com/package/jest)
   - [`jest-environment-jsdom-fourteen@0.1.0`](https://npmjs.com/package/jest-environment-jsdom-fourteen)
   - [`jsdom@14.1.0`](https://npmjs.com/package/jsdom)
   - [`node-fetch@2.6.0`](https://npmjs.com/package/node-fetch)
   - [`on-error-resume-next@1.1.0`](https://npmjs.com/package/on-error-resume-next)
   - [`restify@8.4.0`](https://npmjs.com/package/restify)
   - [`rimraf@3.0.0`](https://npmjs.com/package/rimraf)
   - [`simple-update-in@2.1.1`](https://npmjs.com/package/simple-update-in)
   - [`typescript@3.6.2`](https://npmjs.com/package/typescript)
   - [`webpack@4.39.3`](https://npmjs.com/package/webpack)
   - [`webpack-cli@3.3.8`](https://npmjs.com/package/webpack-cli)

### Added
- Fix [#235](https://github.com/microsoft/BotFramework-DirectLineJS/issues/235). Added metadata when uploading attachments, including `thumbnailUrl`, by [@compulim](https://github.com/compulim), in PR [#236](https://github.com/microsoft/BotFramework-DirectLineJS/pull/236)

### Fixed
- Avoid posting an error on intentional end, by [@orgads](https://github.com/orgads) in PR [#172](https://github.com/microsoft/BotFramework-DirectLineJS/pull/172)
- Surface Web Socket errors, by [@orgads](https://github.com/orgads) in PR [#171](https://github.com/microsoft/BotFramework-DirectLineJS/pull/171)

## [0.11.4] - 2019-03-04
### Changed
- Change reconnect delay to be a random amount between 3s and 15s, by [@mingweiw](https://github.com/mingweiw) in PR [#164](https://github.com/microsoft/BotFramework-DirectLineJS/pull/164)

### Fixed
- Fix [#160](https://github.com/microsoft/BotFramework-DirectLineJS/issues/160). Removed warning if `pollingInterval` is `undefined`, by [@compulim](https://github.com/compulim) in PR [#161](https://github.com/Microosft/BotFramework-DirectLineJS/pull/161)

## [0.11.2] - 2019-02-05
### Fixed
- Fixed an issue where `pollingInterval` set to `undefined` would cause high polling rate, by [@cwhitten](https://github.com/cwhitten) and [@compulim](https://github.com/compulim), in PR [#157](https://github.com/microsoft/BotFramework-DirectLineJS/pull/157)

### Changed
- Used `@babel/preset-typescript` and `webpack@4` to build, in PR [#156](https://github.com/microsoft/BotFramework-DirectLineJS/pull/156)
   - Moved to inline source map for pre-bundle
   - Added `.editorconfig` and `.vscode` for new line and tab size rules

## [0.11.1] - 2019-01-31
### Fixed
- Fixed an issue causing a header to be incorrectly generated. [#153](https://github.com/microsoft/BotFramework-DirectLineJS/pull/153)

## [0.11.0] - 2019-01-28
### Added
- Added protection against user-given pollingInterval values [#129](https://github.com/microsoft/BotFramework-DirectLineJS/pull/129)
- Added custom user agent and header [#148](https://github.com/microsoft/BotFramework-DirectLineJS/pull/148)

### Fixed
- `errorConversationEnded` no longer thrown when calling `DirectLine#end`, by [@orgads](https://github.com/orgads), in PR [#133](https://github.com/microsoft/BotFramework-DirectLineJS/pull/133)

## [0.10.2] - 2019-01-09
- Added `messageBack` to `CardActionTypes` and updated `CardAction` fields, by [@corinagum](https://github.com/corinagum), in PR [#138](https://github.com/microsoft/BotFramework-DirectLineJS/pull/138)
- Expand `CardAction`s with specific types, by [@corinagum](https://github.com/corinagum), in PR [#141](https://github.com/microsoft/BotFramework-DirectLineJS/pull/141)

## [0.10.1] - 2018-12-21
### Changed
- Prevents infinite WebSocket reconnection spam on subsequent token expiration signals [#127](https://github.com/microsoft/BotFramework-DirectLineJS/pull/127)

## [0.10.0] - 2018-10-30
### Added
- Add support for watermark in Web Socket, in [#96](https://github.com/microsoft/BotFramework-DirectLineJS/pull/96)

### Changed
- Delay before retrying Web Socket, in [#97](https://github.com/microsoft/BotFramework-WebChat/pull/97)
- Slow down polling on congested traffic, in [#98](https://github.com/microsoft/BotFramework-DirectLineJS/pull/98)
- Bump dependencies, in [#100](https://github.com/microsoft/BotFramework-DirectLineJS/pull/100)
   - `deep-extend` from `0.4.2` to `0.5.1`
   - `randomatic` from `1.1.7` to `3.1.0`

## [0.9.17] - 2018-08-31
### Changed
- Add handling of 403/500 for `getSessionId`, in [#87](https://github.com/microsoft/BotFramework-DirectLineJS/pull/87)

## [0.9.16] - 2018-08-14
### Added
- Added optional `role` to `User` interface, must be either `"bot"`, `"channel"`, or `"user"`, in [#79](https://github.com/microsoft/BotFramework-DirectLineJS/pull/79)

## [0.9.15] - 2018-04-24
### Added
- OAuthCard and `getSessionId` in PR #67
   - Add OAuthCard ([`c7b8af7`](https://github.com/microsoft/BotFramework-DirectLineJS/commit/c7b8af7be35685c220f2d777daa96f52d757f53f))
   - Add `getSessionId` ([`9c87aa3`](https://github.com/microsoft/BotFramework-DirectLineJS/commit/9c87aa3f54947ea2fee836b41eec8ec45297a57a), [`9a2b2d8`](https://github.com/microsoft/BotFramework-DirectLineJS/commit/9a2b2d889af48e558f563758aa01d498b2b2cf49), [`df84d00`](df84d0054f784ae5eb36784ef07a2aa38ca6c95b), [`92cc331`](92cc33138dfbdd533b4d14f6be275d1c86ef8db4))