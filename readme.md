# Graph JSON Validator

A library that produces statically typed JSON validators for AssemblyScript to work with the [Graph protocol](https://thegraph.com). The library takes in a JSON or YAML document containing the JSON schemas and outputs the required validation code to a file.

## Use Case

Smart contracts events can reference IPFS hashes that contain extra data about the event, so as to reduce gas costs. The library was developed to help validate raw JSON data fetched from aforementioned IPFS hashes.

## Using the library

Add to your subgraph project
```
yarn add git+https://github.com/questbook/graph-json-validator
```

Generate the AS code using the CLI
```
yarn graph-json-validator --schema-path  --out-dir ./src/json-schema
```

Use in a subgraph like
``` ts
import { log } from "@graphprotocol/graph-ts"
import { WorkspaceCreated } from "../generated/QBWorkspaceRegistryContract/QBWorkspaceRegistryContract"
import { Workspace } from "../generated/schema"
import { validatedJsonFromIpfs } from "./json-schema/json"
import { validateWorkspaceCreateRequest, WorkspaceCreateRequest } from "./json-schema"

export function handleWorkspaceCreated(event: WorkspaceCreated): void {
  const entityId = event.params.id.toHex()
  // fetch JSON from IPFS & validate it
  const jsonResult = validatedJsonFromIpfs<WorkspaceCreateRequest>(event.params.metadataHash, validateWorkspaceCreateRequest)
  if(jsonResult.error) {
    log.warning(`[${event.transaction.hash.toHex()}] error in mapping workspace create: "${jsonResult.error!}"`, [])
    return
  }
  const json = jsonResult.value!
  // create entity based on validated & typed up JSON
  const entity = new Workspace(entityId)
  entity.title = json.title
  entity.about = json.about
  entity.logoIpfsHash = json.logoIpfsHash

  entity.save()
}
```