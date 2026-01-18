import { google } from 'googleapis'

export interface AIResponseData {
  script: string
  changes: Array<{
    title: string
    description: string
    page_url: string
    selector: string
    duration_seconds: number
  }>
  report_key: string
}

/**
 * Initialize Google Docs API client
 * Requires GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_PROJECT_ID env vars
 */
export function getGoogleDocsClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const projectId = process.env.GOOGLE_PROJECT_ID

  if (!clientEmail || !privateKey || !projectId) {
    throw new Error('Missing Google service account credentials. Please set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_PROJECT_ID environment variables.')
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive.file'],
  })

  return {
    docs: google.docs({ version: 'v1', auth }),
    drive: google.drive({ version: 'v3', auth }),
    auth,
  }
}

/**
 * Format AI response data into Google Docs requests
 */
export function formatDataForGoogleDocs(data: AIResponseData) {
  const requests: any[] = []
  let currentIndex = 1 // Start after the title

  // Title
  requests.push({
    insertText: {
      location: { index: 1 },
      text: `${data.report_key} - Update Report\n\n`,
    },
  })
  currentIndex += `${data.report_key} - Update Report\n\n`.length

  // Title formatting
  requests.push({
    updateTextStyle: {
      range: {
        startIndex: 1,
        endIndex: currentIndex - 2,
      },
      textStyle: {
        fontSize: { magnitude: 20, unit: 'PT' },
        bold: true,
      },
      fields: 'fontSize,bold',
    },
  })

  // Script/Summary section
  requests.push({
    insertText: {
      location: { index: currentIndex },
      text: 'Summary\n',
    },
  })
  const summaryTitleStart = currentIndex
  currentIndex += 'Summary\n'.length

  requests.push({
    updateTextStyle: {
      range: {
        startIndex: summaryTitleStart,
        endIndex: currentIndex - 1,
      },
      textStyle: {
        fontSize: { magnitude: 16, unit: 'PT' },
        bold: true,
      },
      fields: 'fontSize,bold',
    },
  })

  requests.push({
    insertText: {
      location: { index: currentIndex },
      text: `${data.script}\n\n`,
    },
  })
  currentIndex += `${data.script}\n\n`.length

  // Changes section
  requests.push({
    insertText: {
      location: { index: currentIndex },
      text: 'Changes\n',
    },
  })
  const changesTitleStart = currentIndex
  currentIndex += 'Changes\n'.length

  requests.push({
    updateTextStyle: {
      range: {
        startIndex: changesTitleStart,
        endIndex: currentIndex - 1,
      },
      textStyle: {
        fontSize: { magnitude: 16, unit: 'PT' },
        bold: true,
      },
      fields: 'fontSize,bold',
    },
  })

  // Each change
  data.changes.forEach((change, index) => {
    const changeText = `${index + 1}. ${change.title}\n   ${change.description}\n   Page: ${change.page_url}\n   Selector: ${change.selector}\n   Duration: ${change.duration_seconds}s\n\n`
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: changeText,
      },
    })

    // Make the title bold
    const changeTitleStart = currentIndex
    const changeTitleEnd = currentIndex + `${index + 1}. ${change.title}\n`.length

    requests.push({
      updateTextStyle: {
        range: {
          startIndex: changeTitleStart,
          endIndex: changeTitleEnd - 1,
        },
        textStyle: {
          bold: true,
        },
        fields: 'bold',
      },
    })

    currentIndex += changeText.length
  })

  return requests
}

/**
 * Create a Google Doc from AI response data
 */
export async function createGoogleDoc(data: AIResponseData, documentTitle?: string): Promise<string> {
  const { docs, drive } = getGoogleDocsClient()
  const title = documentTitle || `${data.report_key} - Update Report`

  // Create a new document
  const createResponse = await docs.documents.create({
    requestBody: {
      title,
    },
  })

  const documentId = createResponse.data.documentId
  if (!documentId) {
    throw new Error('Failed to create document')
  }

  // Format and insert content
  const requests = formatDataForGoogleDocs(data)

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests,
    },
  })

  return documentId
}

/**
 * Get a shareable link for the document
 */
export async function getDocumentLink(documentId: string): Promise<string> {
  const { drive } = getGoogleDocsClient()

  // Make the document viewable by anyone with the link
  await drive.permissions.create({
    fileId: documentId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })

  return `https://docs.google.com/document/d/${documentId}/edit`
}
