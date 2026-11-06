import { DynamoDBStreamEvent, Context } from "aws-lambda";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";
import { CognitoIdentityProviderClient, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { eventTimeToHHMM, formatEventDateForEmail, type EventDateLanguage } from '../shared/formatEventDate';

// Initialize AWS services and environment variables
const logger = new Logger({ serviceName: "eventStreamHandler" });
const sendEmailFunctionName = process.env.BAFATORIO_APP_SEND_EMAIL_FUNCTION_NAME || "send-email";
const region = process.env.BAFATORIO_APP_REGION || "eu-west-1";
const lambdaClient = new LambdaClient({ region });
const cognitoClient = new CognitoIdentityProviderClient({ region });
const userPoolId = process.env.BAFATORIO_APP_USER_POOL_ID || '';

/**
 * Get any user attribute from Cognito using the sub (user ID)
 * @param sub The user's ID in Cognito (sub)
 * @param attributeName Name of the attribute to retrieve
 * @returns The attribute value or null if not found
 */
async function getUserAttributeBySub(sub: string, attributeName: string): Promise<string | null> {
  if (!sub || !userPoolId) {
    logger.info("Missing sub or userPoolId");
    return null;
  }
  
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: sub // The sub is used directly as Username
    });
    
    const response = await cognitoClient.send(command);
    
    const attribute = response.UserAttributes?.find(
      attr => attr.Name === attributeName
    );
    
    if (attribute?.Value) {
      logger.info(`Found user attribute ${attributeName}`, { sub, value: attribute.Value });
      return attribute.Value;
    }
    
    logger.info(`Attribute ${attributeName} not found`, { sub });
    return null;
  } catch (error) {
    logger.error(`Error fetching user attribute ${attributeName} from Cognito`, { error, sub });
    return null;
  }
}

/**
 * Extract user sub from owner format if needed
 * @param ownerOrSub The owner string or sub
 * @returns The extracted sub
 */
function extractSubFromOwner(ownerOrSub: string): string {
  // If in format "sub::sub", extract the first part
  if (ownerOrSub && ownerOrSub.includes('::')) {
    return ownerOrSub.split('::')[0];
  }
  return ownerOrSub; // Return as is if not in the expected format
}

/**
 * Get user's email from Cognito
 * @param userIdOrOwner The user's ID (sub) or owner string
 * @returns The user's email or null if not found
 */
async function getUserEmail(userIdOrOwner: string): Promise<string | null> {
  if (!userIdOrOwner) {
    logger.info("Missing userId or owner");
    return null;
  }
  
  const sub = extractSubFromOwner(userIdOrOwner);
  return getUserAttributeBySub(sub, "email");
}

/**
 * Get user's name from Cognito
 * @param userIdOrOwner The user's ID (sub) or owner string
 * @returns The user's name or null if not found
 */
async function getUserName(userIdOrOwner: string): Promise<string | null> {
  if (!userIdOrOwner) {
    logger.info("Missing userId or owner");
    return null;
  }
  
  const sub = extractSubFromOwner(userIdOrOwner);
  return getUserAttributeBySub(sub, "name");
}

/**
 * Get user's preferred language from Cognito custom attributes
 * @param userIdOrOwner The user's ID (sub) or owner string
 * @returns The user's preferred language code (pt, en, fr)
 */
async function getUserLanguage(userIdOrOwner: string): Promise<'pt' | 'en' | 'fr'> {
  if (!userIdOrOwner || !userPoolId) {
    logger.info("Missing userId or userPoolId, using default language");
    return 'pt';
  }
  
  // Extract sub if in owner format
  const sub = extractSubFromOwner(userIdOrOwner);
  
  try {
    const langRaw = await getUserAttributeBySub(sub, 'custom:signup_language');
    
    if (langRaw) {
      // Map language code from Cognito (e.g., 'pt-PT', 'en-US') to short code used by templates ('pt', 'en', 'fr')
      const lang = langRaw.startsWith('pt') ? 'pt' : 
                  langRaw.startsWith('en') ? 'en' : 
                  langRaw.startsWith('fr') ? 'fr' : 'pt';
      
      logger.info("Found user language preference", { sub, language: lang });
      return lang as 'pt' | 'en' | 'fr';
    }
    
    logger.info("No language preference found, using default", { sub });
    return 'pt';
  } catch (error) {
    logger.error("Error fetching user language from Cognito", { error, sub });
    return 'pt';
  }
}

/**
 * Lambda handler for processing DynamoDB Stream events from Event table
 * Triggers email sending when a new event is created or updated
 */
export const handler = async (event: DynamoDBStreamEvent, context: Context) => {
  logger.addContext(context);
  logger.info("Processing DynamoDB Stream events", { recordCount: event.Records.length });
  
  try {
    for (const record of event.Records) {
      // Process INSERT events (new events created)
      if (record.eventName === "INSERT" && record.dynamodb?.NewImage) {
        await processNewEvent(record);
      }
      // Process MODIFY events (events updated)
      // TODO: Re-enable when we implement smart change detection
      // Currently disabled because it sends emails on every small change
      // Future improvements:
      // - Only send when significant fields change (date, location, status)
      // - Debounce multiple changes within a time window
      // - Allow user to configure notification preferences
      else if (record.eventName === "MODIFY" && record.dynamodb?.NewImage) {
        logger.info("Event update detected but notifications temporarily disabled", {
          eventId: record.dynamodb?.Keys?.id?.S
        });
        // await processEventUpdate(record);
      }
    }
    
    logger.info("Successfully processed all stream events");
    return { statusCode: 200, body: "Processing completed" };
  } catch (error) {
    logger.error("Error processing stream events", { error });
    return { statusCode: 500, body: "Error processing events" };
  }
};

/**
 * Process a new event record from the stream
 * Extract event data and trigger email sending
 */
async function processNewEvent(record: any) {
  try {
    // Convert DynamoDB format to JS object
    const newEvent = unmarshall(record.dynamodb.NewImage);
    logger.info("New event created", { eventId: newEvent.id, eventTitle: newEvent.eventTitle });
    
    // get user language from Cognito
    let language: 'pt' | 'en' | 'fr' = 'pt'; // default
    
    // Try to get language using sub or owner
    if (newEvent.sub) {
      // If we have the sub directly, use it
      language = await getUserLanguage(newEvent.sub);
      logger.info("Using user's preferred language from sub", { sub: newEvent.sub, language });
    } else if (newEvent.owner) {
      // Extract sub from owner format if needed
      const sub = extractSubFromOwner(newEvent.owner);
      language = await getUserLanguage(sub);
      logger.info("Using user's preferred language from owner", { owner: newEvent.owner, sub, language });
    } else {
      logger.info("No user identifier found, using default language", { language });
    }
    
    // Get user email and name from Cognito if organizerId is available
    let userEmail = newEvent.eventManagerEmail; // Default fallback
    let userName = newEvent.eventManager; // Default fallback
    
    if (newEvent.organizerId) {
      // Get email from Cognito
      const cognitoEmail = await getUserEmail(newEvent.organizerId);
      if (cognitoEmail) {
        userEmail = cognitoEmail;
        logger.info("Using email from Cognito", { cognitoEmail, organizerId: newEvent.organizerId });
      } else {
        logger.info("Could not retrieve email from Cognito, using eventManagerEmail as fallback", { eventManagerEmail: newEvent.eventManagerEmail });
      }
      
      // Get name from Cognito
      const cognitoName = await getUserName(newEvent.organizerId);
      if (cognitoName) {
        userName = cognitoName;
        logger.info("Using name from Cognito", { cognitoName, organizerId: newEvent.organizerId });
      } else {
        logger.info("Could not retrieve name from Cognito, using eventManager as fallback", { eventManager: newEvent.eventManager });
      }
    } else {
      logger.info("No organizerId found, using event data as fallback", { 
        eventManagerEmail: newEvent.eventManagerEmail,
        eventManager: newEvent.eventManager 
      });
    }
    
    const formattedDate = formatEventDateForEmail(newEvent, language as EventDateLanguage);
    const formattedTime = eventTimeToHHMM(newEvent.eventTime);

    // Prepare payload for email Lambda following the expected structure
    const payload = {
      arguments: {
        to: userEmail,
        emailType: "eventCreation",
        participantName: newEvent.eventManager,
        participantId: newEvent.id, // Using event ID as participant ID for tracking
        eventName: newEvent.eventTitle,
        eventId: newEvent.id,
        eventDate: formattedDate,
        eventTime: formattedTime,
        eventLocation: newEvent.eventLocation || '',
        eventManagerName: userName,
        eventManagerContact: newEvent.eventManagerPhone || userEmail,
        eventManager: userName,
        eventTitle: newEvent.eventTitle,
        eventType: newEvent.eventType || '',
        eventCategories: Array.isArray(newEvent.categories) ? newEvent.categories.join(', ') : (newEvent.categories || ''),
        description: newEvent.description || '',
        budget: newEvent.budget || '',
        eventStatus: newEvent.eventStatus || 'ACTIVE',
        organizerId: newEvent.organizerId || '',
        language: language
      }
    };
    
    // Invoke email sending Lambda
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: sendEmailFunctionName,
        InvocationType: "Event", // async invocation
        Payload: Buffer.from(JSON.stringify(payload))
      })
    );
    
    logger.info("Event creation email triggered", { 
      eventId: newEvent.id, 
      to: newEvent.eventManagerEmail,
      language,
      emailType: "eventCreation" 
    });
  } catch (error) {
    logger.error("Error processing new event or invoking email Lambda", { 
      error, 
      recordId: record.eventID 
    });
    throw error; // Re-throw to be caught by main handler
  }
}

/**
 * Process an event update record from the stream
 * Extract event data and trigger email sending for updates
 */
async function processEventUpdate(record: any) {
  try {
    // Convert DynamoDB format to JS object
    const updatedEvent = unmarshall(record.dynamodb.NewImage);
    logger.info("Event updated", { eventId: updatedEvent.id, eventTitle: updatedEvent.eventTitle });
    
    // get user language from Cognito
    let language: 'pt' | 'en' | 'fr' = 'pt'; // default
    
    // Try to get language using sub or owner
    if (updatedEvent.sub) {
      // If we have the sub directly, use it
      language = await getUserLanguage(updatedEvent.sub);
      logger.info("Using user's preferred language from sub", { sub: updatedEvent.sub, language });
    } else if (updatedEvent.owner) {
      // Extract sub from owner format if needed
      const sub = extractSubFromOwner(updatedEvent.owner);
      language = await getUserLanguage(sub);
      logger.info("Using user's preferred language from owner", { owner: updatedEvent.owner, sub, language });
    } else {
      logger.info("No user identifier found, using default language", { language });
    }
    
    // Get user email and name from Cognito if organizerId is available
    let userEmail = updatedEvent.eventManagerEmail; // Default fallback
    let userName = updatedEvent.eventManager; // Default fallback
    
    if (updatedEvent.organizerId) {
      // Get email from Cognito
      const cognitoEmail = await getUserEmail(updatedEvent.organizerId);
      if (cognitoEmail) {
        userEmail = cognitoEmail;
        logger.info("Using email from Cognito", { cognitoEmail, organizerId: updatedEvent.organizerId });
      } else {
        logger.info("Could not retrieve email from Cognito, using eventManagerEmail as fallback", { eventManagerEmail: updatedEvent.eventManagerEmail });
      }
      
      // Get name from Cognito
      const cognitoName = await getUserName(updatedEvent.organizerId);
      if (cognitoName) {
        userName = cognitoName;
        logger.info("Using name from Cognito", { cognitoName, organizerId: updatedEvent.organizerId });
      } else {
        logger.info("Could not retrieve name from Cognito, using eventManager as fallback", { eventManager: updatedEvent.eventManager });
      }
    } else {
      logger.info("No organizerId found, using event data as fallback", { 
        eventManagerEmail: updatedEvent.eventManagerEmail,
        eventManager: updatedEvent.eventManager 
      });
    }
    
    const formattedDate = formatEventDateForEmail(updatedEvent, language as EventDateLanguage);
    const formattedTime = eventTimeToHHMM(updatedEvent.eventTime);

    // Prepare payload for email Lambda following the expected structure
    const payload = {
      arguments: {
        to: userEmail,
        emailType: "eventUpdate",
        participantName: userName,
        participantId: updatedEvent.id,
        eventName: updatedEvent.eventTitle,
        eventId: updatedEvent.id,
        eventDate: formattedDate,
        eventTime: formattedTime,
        eventLocation: updatedEvent.eventLocation || '',
        eventManagerName: userName,
        eventManagerContact: updatedEvent.eventManagerPhone || userEmail,
        eventManager: userName,
        eventTitle: updatedEvent.eventTitle,
        eventType: updatedEvent.eventType || '',
        eventCategories: Array.isArray(updatedEvent.categories) ? updatedEvent.categories.join(', ') : (updatedEvent.categories || ''),
        description: updatedEvent.description || '',
        budget: updatedEvent.budget || '',
        eventStatus: updatedEvent.eventStatus || 'ACTIVE',
        organizerId: updatedEvent.organizerId || '',
        language: language
      }
    };
    
    // Invoke email sending Lambda
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: sendEmailFunctionName,
        InvocationType: "Event", // async invocation
        Payload: Buffer.from(JSON.stringify(payload))
      })
    );
    
    logger.info("Event update email triggered", { 
      eventId: updatedEvent.id, 
      to: updatedEvent.eventManagerEmail,
      language,
      emailType: "eventUpdate" 
    });
  } catch (error) {
    logger.error("Error processing event update or invoking email Lambda", { 
      error, 
      recordId: record.eventID 
    });
    throw error; // Re-throw to be caught by main handler
  }
}
