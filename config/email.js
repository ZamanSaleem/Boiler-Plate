const emailConfig = {
  // Gmail Configuration
   gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    },
    from: process.env.MAIL_FROM 
  },

  // Outlook/Hotmail Configuration
  // outlook: {
  //   host: 'smtp-mail.outlook.com',
  //   port: 587,
  //   secure: false,
  //   auth: {
  //     user: 'your-email@outlook.com',
  //     pass: 'your-password'
  //   },
  //   from: 'noreply@syncmosaic.com'
  // },

  // // Yahoo Configuration
  // yahoo: {
  //   host: 'smtp.mail.yahoo.com',
  //   port: 587,
  //   secure: false,
  //   auth: {
  //     user: 'your-email@yahoo.com',
  //     pass: 'your-app-password'
  //   },
  //   from: 'noreply@syncmosaic.com'
  // },

  // // Custom SMTP Configuration
  // custom: {
  //   host: 'your-smtp-server.com',
  //   port: 587,
  //   secure: false,
  //   auth: {
  //     user: 'your-username',
  //     pass: 'your-password'
  //   },
  //   from: 'noreply@syncmosaic.com'
  // }
};

module.exports = emailConfig; 