import yaml from 'js-yaml'

export const yamlToJson = (data: string) => {
  const customSchema = yaml.DEFAULT_SCHEMA.extend({
    implicit: [
      new yaml.Type('tag:yaml.org,2002:timestamp', {
        kind: 'scalar',
        resolve: () => false,
        construct: (data: unknown) => data,
      }),
    ],
  })

  try {
    const json = yaml.load(data, { schema: customSchema }) as Record<string, unknown>
    // Check if json is an object
    return json && typeof json === 'object' ? replaceNullWithEmptyString(json) : null
  }
  catch {
    return null
  }
}

const replaceNullWithEmptyString = (obj: Record<string, unknown>): Record<string, unknown> => {
  for (const key in obj) {
    if (obj[key] === null) {
      obj[key] = ''
    }
    else if (typeof obj[key] === 'object' && obj[key] !== null) {
      obj[key] = replaceNullWithEmptyString(obj[key] as Record<string, unknown>)
    }
  }
  return obj
}
