import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Initialize Google Auth with Service Account
function getGoogleAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive',
    ],
  });
  return auth;
}

interface Change {
  title: string;
  description: string;
  page_url?: string;
  selector?: string;
  duration_seconds?: number;
}

interface Screenshot {
  index: number;
  title: string;
  path: string;
  filepath: string;
  duration?: number;
}

export async function POST(request: Request) {
  try {
    const { reportKey, projectName, script, changes, screenshots } = await request.json();

    if (!reportKey) {
      return new Response(
        JSON.stringify({ error: 'reportKey is required' }),
        { status: 400 }
      );
    }

    console.log('📄 Starting Google Doc generation for:', reportKey);

    const auth = getGoogleAuth();
    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Step 1: Create a new Google Doc
    const docTitle = `${projectName || 'Project'} Update - ${reportKey}`;
    const createResponse = await docs.documents.create({
      requestBody: {
        title: docTitle,
      },
    });

    const documentId = createResponse.data.documentId;
    if (!documentId) {
      throw new Error('Failed to create Google Doc');
    }

    console.log('✅ Created Google Doc:', documentId);

    // Step 2: Upload screenshots to Google Drive and get their IDs
    const uploadedImages: { imageId: string; title: string; description: string }[] = [];

    // Use provided screenshots or find them from the reportKey
    let screenshotFiles = screenshots || [];
    
    if (screenshotFiles.length === 0 && changes) {
      // Try to find screenshots in the public folder
      const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots', reportKey);
      if (fs.existsSync(screenshotsDir)) {
        const files = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
        screenshotFiles = files.map((file, index) => ({
          index,
          title: changes[index]?.title || `Change ${index + 1}`,
          description: changes[index]?.description || '',
          filepath: path.join(screenshotsDir, file),
          path: `/screenshots/${reportKey}/${file}`,
        }));
      }
    }

    for (const screenshot of screenshotFiles) {
      const filePath = screenshot.filepath || path.join(process.cwd(), 'public', screenshot.path);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`Screenshot not found: ${filePath}`);
        continue;
      }

      // Upload to Google Drive
      const fileMetadata = {
        name: `${reportKey}_${path.basename(filePath)}`,
        mimeType: 'image/png',
      };

      const media = {
        mimeType: 'image/png',
        body: fs.createReadStream(filePath),
      };

      const uploadResponse = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });

      const imageId = uploadResponse.data.id;
      if (imageId) {
        // Make the image publicly accessible
        await drive.permissions.create({
          fileId: imageId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });

        uploadedImages.push({
          imageId,
          title: screenshot.title || `Change ${screenshot.index + 1}`,
          description: screenshot.description || changes?.[screenshot.index]?.description || '',
        });

        console.log(`✅ Uploaded image: ${imageId}`);
      }
    }

    // Step 3: Build the document content
    const requests: any[] = [];
    let currentIndex = 1; // Google Docs index starts at 1

    // Add document header
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const headerText = `📋 Project Update Report\n${dateStr}\n\n`;
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: headerText,
      },
    });
    currentIndex += headerText.length;

    // Style the header
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex: 24 },
        paragraphStyle: {
          namedStyleType: 'HEADING_1',
          alignment: 'CENTER',
        },
        fields: 'namedStyleType,alignment',
      },
    });

    // Add script/summary if provided
    if (script) {
      const summaryText = `Summary\n${script}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: summaryText,
        },
      });
      
      // Style "Summary" as heading
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: currentIndex, endIndex: currentIndex + 8 },
          paragraphStyle: {
            namedStyleType: 'HEADING_2',
          },
          fields: 'namedStyleType',
        },
      });
      
      currentIndex += summaryText.length;
    }

    // Add divider
    const divider = '─'.repeat(50) + '\n\n';
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: divider,
      },
    });
    currentIndex += divider.length;

    // Add "Changes" heading
    const changesHeading = 'Changes\n\n';
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: changesHeading,
      },
    });
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: currentIndex, endIndex: currentIndex + 8 },
        paragraphStyle: {
          namedStyleType: 'HEADING_2',
        },
        fields: 'namedStyleType',
      },
    });
    currentIndex += changesHeading.length;

    // Add each screenshot with caption
    for (let i = 0; i < uploadedImages.length; i++) {
      const img = uploadedImages[i];
      
      // Add change number and title
      const titleText = `${i + 1}. ${img.title}\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: titleText,
        },
      });
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: currentIndex, endIndex: currentIndex + titleText.length },
          paragraphStyle: {
            namedStyleType: 'HEADING_3',
          },
          fields: 'namedStyleType',
        },
      });
      currentIndex += titleText.length;

      // Add the image
      requests.push({
        insertInlineImage: {
          location: { index: currentIndex },
          uri: `https://drive.google.com/uc?id=${img.imageId}`,
          objectSize: {
            width: { magnitude: 500, unit: 'PT' },
            height: { magnitude: 281, unit: 'PT' }, // 16:9 aspect ratio
          },
        },
      });
      currentIndex += 1; // Image takes 1 index position

      // Add newline after image
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: '\n',
        },
      });
      currentIndex += 1;

      // Add caption/description
      if (img.description) {
        const captionText = `${img.description}\n\n`;
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: captionText,
          },
        });
        // Style caption as italic
        requests.push({
          updateTextStyle: {
            range: { startIndex: currentIndex, endIndex: currentIndex + captionText.length - 2 },
            textStyle: {
              italic: true,
              foregroundColor: {
                color: { rgbColor: { red: 0.4, green: 0.4, blue: 0.4 } },
              },
            },
            fields: 'italic,foregroundColor',
          },
        });
        currentIndex += captionText.length;
      }

      // Add separator between changes (except for the last one)
      if (i < uploadedImages.length - 1) {
        const separator = '\n' + '─'.repeat(30) + '\n\n';
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: separator,
          },
        });
        currentIndex += separator.length;
      }
    }

    // Step 4: Apply all the formatting
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests },
      });
      console.log('✅ Document content added');
    }

    // Step 5: Make the document shareable (anyone with link can view)
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit?usp=sharing`;
    console.log('✅ Google Doc generated:', docUrl);

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        documentUrl: docUrl,
        title: docTitle,
        imagesUploaded: uploadedImages.length,
      }),
      { status: 200 }
    );

  } catch (error: any) {
    console.error('❌ Google Doc generation failed:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate Google Doc',
        details: error.toString(),
      }),
      { status: 500 }
    );
  }
}

