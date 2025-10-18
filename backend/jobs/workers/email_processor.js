import { logger } from "../../config/index.js";
import sendMail from "../../utils/send_mail.js";

export default async function (job, done) {
  try {
    const emailData = job.data;
    await sendMail({
      email: emailData.to,
      subject: emailData.subject,
      message: emailData.text,
    });
    logger.info(`Email sent successfully to ${emailData.to}`);
    done();
    return { success: true };
  } catch (error) {
    logger.error(`Failed to send email to ${job.data.to}: ${error.message}`);
    done(error);
    throw new Error(error.message);
  }
}
