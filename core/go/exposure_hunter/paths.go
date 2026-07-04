package main

// getAllPaths returns 1000+ sensitive paths organized by category
func getAllPaths() []pathEntry {
	var all []pathEntry
	all = append(all, gitPaths()...)
	all = append(all, envPaths()...)
	all = append(all, keyPaths()...)
	all = append(all, dbPaths()...)
	all = append(all, debugPaths()...)
	all = append(all, apiPaths()...)
	all = append(all, adminPaths()...)
	all = append(all, infraPaths()...)
	all = append(all, infoPaths()...)
	all = append(all, backupPaths()...)
	all = append(all, cmsPaths()...)
	all = append(all, configPaths()...)
	all = append(all, logPaths()...)
	all = append(all, cloudPaths()...)
	return all
}

func gitPaths() []pathEntry {
	p := []string{
		"/.git/HEAD", "/.git/config", "/.git/index", "/.git/logs/HEAD",
		"/.git/refs/heads/main", "/.git/refs/heads/master", "/.git/refs/heads/develop",
		"/.git/COMMIT_EDITMSG", "/.git/description", "/.git/info/exclude",
		"/.git/packed-refs", "/.git/objects/info/packs", "/.git/refs/stash",
		"/.git/logs/refs/heads/master", "/.git/logs/refs/heads/main",
		"/.git/refs/remotes/origin/HEAD", "/.git/FETCH_HEAD", "/.git/ORIG_HEAD",
		"/.gitignore", "/.gitattributes", "/.gitmodules",
		"/.svn/entries", "/.svn/wc.db", "/.svn/all-wcprops",
		"/.hg/store/00manifest.i", "/.hg/dirstate", "/.hg/hgrc",
		"/.bzr/README", "/.bzr/branch/last-revision",
		"/CVS/Root", "/CVS/Entries",
		"/.git-credentials", "/.gitconfig",
	}
	return makePaths(p, "Source Code", "critical")
}

func envPaths() []pathEntry {
	p := []string{
		"/.env", "/.env.local", "/.env.production", "/.env.staging", "/.env.development",
		"/.env.test", "/.env.backup", "/.env.bak", "/.env.old", "/.env.save",
		"/.env.prod", "/.env.dev", "/.env.stage", "/.env.live", "/.env.orig",
		"/.env.dist", "/.env.example", "/.env.sample", "/.env.swp", "/.env~",
		"/env.js", "/env.json", "/env.yml", "/env.yaml", "/env.php", "/env.py",
		"/config.php", "/config.php.bak", "/config.php~", "/config.php.old", "/config.php.save",
		"/config.yml", "/config.yaml", "/config.json", "/config.xml", "/config.ini",
		"/config.inc.php", "/config.inc", "/config.bak", "/config.old", "/config.backup",
		"/configuration.php", "/configuration.php.bak",
		"/settings.py", "/settings.yml", "/settings.json", "/settings.ini", "/settings.cfg",
		"/settings.php", "/settings.local.php",
		"/application.yml", "/application.yaml", "/application.properties",
		"/application-prod.yml", "/application-dev.yml", "/application-staging.yml",
		"/application.json", "/application.ini",
		"/database.yml", "/database.json", "/database.ini", "/database.php",
		"/credentials.json", "/credentials.yml", "/credentials.xml",
		"/secrets.json", "/secrets.yml", "/secrets.yaml",
		"/wp-config.php", "/wp-config.php.bak", "/wp-config.php~", "/wp-config.php.old",
		"/wp-config.php.save", "/wp-config.php.orig", "/wp-config.php.dist",
		"/wp-config.txt", "/wp-config-sample.php",
		"/web.config", "/web.config.bak", "/web.config.old", "/web.config.txt",
		"/.htpasswd", "/.htaccess", "/.htaccess.bak",
		"/appsettings.json", "/appsettings.Development.json", "/appsettings.Production.json",
		"/appsettings.Staging.json",
		"/connectionstrings.config", "/machine.config",
		"/local.settings.json", "/launchSettings.json",
		"/parameters.yml", "/parameters.yaml", "/parameters.ini",
		"/bootstrap.yml", "/bootstrap.properties",
		"/conf/server.xml", "/conf/web.xml", "/conf/context.xml",
		"/gruntfile.js", "/gulpfile.js", "/webpack.config.js",
		"/next.config.js", "/nuxt.config.js", "/vue.config.js",
		"/firebase.json", "/firebaserc", "/.firebaserc",
		"/netlify.toml", "/vercel.json", "/now.json",
		"/amplify.yml", "/amplify/backend/amplify-meta.json",
	}
	return makePaths(p, "Secrets", "critical")
}

func keyPaths() []pathEntry {
	p := []string{
		"/id_rsa", "/id_rsa.pub", "/id_dsa", "/id_dsa.pub",
		"/id_ecdsa", "/id_ecdsa.pub", "/id_ed25519", "/id_ed25519.pub",
		"/.ssh/authorized_keys", "/.ssh/id_rsa", "/.ssh/id_dsa",
		"/.ssh/id_ecdsa", "/.ssh/id_ed25519", "/.ssh/known_hosts", "/.ssh/config",
		"/server.key", "/server.pem", "/server.crt",
		"/privatekey.pem", "/private.key", "/private.pem",
		"/ssl/private.key", "/ssl/server.key", "/ssl/cert.pem",
		"/cert.pem", "/cert.key", "/cert.crt", "/ca.pem", "/ca.key",
		"/ssl.key", "/ssl.pem", "/ssl.crt",
		"/key.pem", "/key.json",
		"/.pgpass", "/.my.cnf", "/.mysql_history", "/.psql_history",
		"/.netrc", "/.npmrc", "/.pypirc", "/.gem/credentials",
		"/.docker/config.json", "/.kube/config",
		"/service-account.json", "/gcloud-service-key.json",
		"/aws-credentials", "/.aws/credentials", "/.aws/config",
		"/token.json", "/tokens.json", "/oauth-token.json",
		"/.google_authenticator", "/keystore.jks", "/truststore.jks",
		"/jwt.key", "/jwt-secret.txt", "/api-key.txt", "/api_key.txt",
	}
	return makePaths(p, "Keys", "critical")
}

func dbPaths() []pathEntry {
	p := []string{
		"/backup.sql", "/dump.sql", "/database.sql", "/db.sql", "/data.sql",
		"/mysql.sql", "/postgres.sql", "/export.sql", "/import.sql",
		"/backup.sql.gz", "/dump.sql.gz", "/database.sql.gz", "/db.sql.gz",
		"/backup.sql.bz2", "/dump.sql.bz2", "/backup.sql.zip",
		"/backup.tar.gz", "/backup.tar", "/backup.zip", "/backup.rar", "/backup.7z",
		"/database.tar.gz", "/database.zip", "/database.bak",
		"/db_backup.sql", "/db_dump.sql", "/db-backup.sql", "/db-dump.sql",
		"/site_backup.zip", "/site-backup.zip", "/site.zip", "/site.tar.gz",
		"/www.zip", "/www.tar.gz", "/wwwroot.zip",
		"/htdocs.zip", "/htdocs.tar.gz",
		"/public_html.zip", "/public_html.tar.gz",
		"/html.zip", "/html.tar.gz",
		"/web.zip", "/web.tar.gz",
		"/archive.zip", "/archive.tar.gz", "/old.zip",
		"/data.zip", "/data.tar.gz", "/data.csv", "/data.json",
		"/users.sql", "/users.csv", "/users.json", "/users.xml",
		"/customers.sql", "/customers.csv", "/members.sql",
		"/accounts.sql", "/accounts.csv",
		"/passwords.txt", "/passwords.csv", "/passwords.sql",
		"/emails.txt", "/emails.csv",
		"/dump.tar.gz", "/dump.zip", "/dump.rdb",
		"/mongo-dump.tar.gz", "/mongodump.tar.gz",
		"/redis-dump.rdb", "/appendonly.aof",
		"/full-backup.zip", "/full-backup.tar.gz",
		"/daily-backup.zip", "/weekly-backup.zip",
		"/backup-db.sql", "/backup-database.sql",
		"/production.sql", "/staging.sql", "/dev.sql",
	}
	return makePaths(p, "Database", "critical")
}

func debugPaths() []pathEntry {
	p := []string{
		"/phpinfo.php", "/info.php", "/test.php", "/pi.php", "/php_info.php",
		"/debug", "/debug/", "/trace", "/trace/",
		"/actuator", "/actuator/env", "/actuator/health", "/actuator/info",
		"/actuator/configprops", "/actuator/beans", "/actuator/mappings",
		"/actuator/heapdump", "/actuator/threaddump", "/actuator/loggers",
		"/actuator/metrics", "/actuator/scheduledtasks", "/actuator/httptrace",
		"/actuator/auditevents", "/actuator/sessions", "/actuator/shutdown",
		"/actuator/caches", "/actuator/flyway", "/actuator/liquibase",
		"/actuator/prometheus", "/actuator/jolokia",
		"/server-status", "/server-info", "/.server-status",
		"/jmx-console/", "/web-console/", "/invoke/",
		"/elmah.axd", "/errorlog.axd", "/trace.axd",
		"/telescope", "/telescope/requests",
		"/_debugbar", "/_debugbar/open",
		"/__debug__/", "/_debug/", "/debug/default/view",
		"/debug/vars", "/debug/pprof/", "/debug/pprof/goroutine",
		"/debug/pprof/heap", "/debug/pprof/threadcreate",
		"/metrics", "/metrics/", "/prometheus", "/prometheus/metrics",
		"/health", "/healthcheck", "/health.json", "/healthz",
		"/status", "/status.json", "/ready", "/readyz", "/livez",
		"/_status", "/_health", "/_monitor",
		"/console/", "/console/login",
		"/solr/admin/", "/solr/#/",
		"/_cat/indices", "/_cluster/health", "/_nodes",
		"/apc.php", "/opcache.php", "/memcache.php",
		"/test", "/test/", "/tests/", "/testing/",
		"/_profiler/", "/profiler/", "/silk/",
		"/rails/info/properties", "/rails/info/routes",
		"/spring/health", "/spring/env",
		"/stats", "/statistics", "/sys", "/system",
	}
	return makePaths(p, "Debug", "high")
}

func apiPaths() []pathEntry {
	p := []string{
		"/swagger.json", "/swagger.yaml", "/swagger.yml",
		"/swagger-ui.html", "/swagger-ui/", "/swagger-ui/index.html",
		"/swagger-resources", "/swagger-resources/configuration",
		"/api-docs", "/api-docs/", "/api/docs", "/api/docs/",
		"/api/swagger", "/api/swagger.json", "/api/swagger.yaml",
		"/api/swagger-ui.html", "/api/swagger-ui/",
		"/openapi.json", "/openapi.yaml", "/openapi.yml", "/openapi/",
		"/v1/api-docs", "/v2/api-docs", "/v3/api-docs",
		"/v1/swagger.json", "/v2/swagger.json", "/v3/swagger.json",
		"/graphql", "/graphiql", "/altair", "/playground",
		"/__graphql", "/api/graphql", "/graphql/console",
		"/api/", "/api/v1/", "/api/v2/", "/api/v3/",
		"/api/config", "/api/debug", "/api/test", "/api/status",
		"/api/users", "/api/admin", "/api/internal",
		"/api/health", "/api/version", "/api/info",
		"/rest/api/", "/rest/api/2/", "/rest/api/latest/",
		"/jsonapi/", "/odata/", "/soap/",
		"/wsdl", "/wsdl/", "/?wsdl",
		"/api/v1/users", "/api/v1/accounts", "/api/v1/admin",
		"/api-explorer/", "/developer/", "/developers/",
		"/redoc", "/rapidoc", "/stoplight/",
		"/api/schema", "/api/openapi",
	}
	return makePaths(p, "API Docs", "high")
}

func adminPaths() []pathEntry {
	p := []string{
		"/admin/", "/admin/login", "/admin/dashboard", "/admin/index",
		"/admin/config", "/admin/settings", "/admin/users",
		"/administrator/", "/administrator/login",
		"/wp-admin/", "/wp-login.php", "/wp-admin/admin-ajax.php",
		"/phpmyadmin/", "/pma/", "/myadmin/", "/mysql/", "/mysqladmin/",
		"/adminer.php", "/adminer/", "/adminer-4.php",
		"/cpanel/", "/cpanel/login", "/webmail/",
		"/_admin/", "/panel/", "/manage/", "/management/",
		"/manager/html", "/manager/", "/manager/status",
		"/dashboard/", "/dashboard/login",
		"/controlpanel/", "/control-panel/",
		"/siteadmin/", "/site-admin/",
		"/admin.php", "/admin.html", "/login.php", "/login.html",
		"/signin", "/signup", "/register",
		"/user/login", "/user/admin",
		"/cms/", "/cms/admin", "/cms/login",
		"/portal/", "/portal/admin",
		"/backend/", "/backend/login",
		"/staff/", "/staff/login",
		"/modx/", "/modx/manager",
		"/bitrix/admin/", "/bitrix/",
		"/typo3/", "/typo3/login",
		"/umbraco/", "/umbraco/login",
		"/sitefinity/", "/kentico/",
		"/sitecore/login", "/sitecore/admin",
		"/craft/", "/craft/admin",
		"/ghost/", "/ghost/api/",
		"/strapi/", "/directus/",
		"/cockpit/", "/keystone/",
	}
	return makePaths(p, "Admin", "high")
}

func infraPaths() []pathEntry {
	p := []string{
		"/Dockerfile", "/docker-compose.yml", "/docker-compose.yaml",
		"/docker-compose.override.yml", "/docker-compose.prod.yml",
		"/docker-compose.dev.yml", "/.dockerignore", "/.docker/config.json",
		"/Vagrantfile", "/Berksfile",
		"/terraform.tfstate", "/terraform.tfstate.backup", "/terraform.tfvars",
		"/.terraform/", "/main.tf", "/variables.tf", "/outputs.tf",
		"/terraform.lock.hcl", "/.terraform.lock.hcl",
		"/ansible.cfg", "/playbook.yml", "/inventory", "/hosts",
		"/site.yml", "/group_vars/all", "/roles/",
		"/Jenkinsfile", "/jenkins.yml", "/.jenkins/",
		"/.travis.yml", "/.circleci/config.yml",
		"/.gitlab-ci.yml", "/.github/workflows/", "/.github/workflows/main.yml",
		"/bitbucket-pipelines.yml", "/azure-pipelines.yml",
		"/cloudbuild.yaml", "/buildspec.yml",
		"/Procfile", "/Makefile", "/Rakefile",
		"/package.json", "/package-lock.json", "/yarn.lock", "/pnpm-lock.yaml",
		"/composer.json", "/composer.lock",
		"/Gemfile", "/Gemfile.lock",
		"/requirements.txt", "/requirements-dev.txt", "/requirements-prod.txt",
		"/Pipfile", "/Pipfile.lock", "/poetry.lock", "/pyproject.toml",
		"/go.mod", "/go.sum",
		"/pom.xml", "/build.gradle", "/build.gradle.kts", "/settings.gradle",
		"/Cargo.toml", "/Cargo.lock",
		"/mix.exs", "/rebar.config", "/stack.yaml",
		"/tsconfig.json", "/jsconfig.json", "/babel.config.js",
		"/jest.config.js", "/vitest.config.js",
		"/.eslintrc", "/.eslintrc.json", "/.prettierrc",
		"/.editorconfig", "/.browserslistrc",
		"/sonar-project.properties", "/.sonarcloud.properties",
		"/chart.yaml", "/values.yaml", "/helmfile.yaml",
		"/kustomization.yaml", "/skaffold.yaml",
		"/serverless.yml", "/serverless.yaml",
		"/sam-template.yaml", "/template.yaml",
		"/cdk.json", "/cdk.context.json",
	}
	return makePaths(p, "Infra", "high")
}

func infoPaths() []pathEntry {
	p := []string{
		"/robots.txt", "/sitemap.xml", "/sitemap_index.xml",
		"/crossdomain.xml", "/clientaccesspolicy.xml",
		"/.well-known/security.txt", "/.well-known/openid-configuration",
		"/.well-known/apple-app-site-association",
		"/.well-known/assetlinks.json", "/.well-known/change-password",
		"/security.txt", "/humans.txt", "/ads.txt", "/app-ads.txt",
		"/.DS_Store", "/Thumbs.db", "/desktop.ini",
		"/WEB-INF/web.xml", "/WEB-INF/classes/", "/WEB-INF/lib/",
		"/META-INF/MANIFEST.MF", "/META-INF/context.xml",
		"/readme.md", "/README.md", "/README.txt", "/readme.txt",
		"/CHANGELOG.md", "/CHANGELOG.txt", "/CHANGES.txt",
		"/LICENSE", "/LICENSE.txt", "/VERSION", "/VERSION.txt",
		"/INSTALL.md", "/INSTALL.txt", "/TODO.md", "/TODO.txt",
		"/release-notes.txt", "/release_notes.txt",
		"/.idea/workspace.xml", "/.idea/modules.xml", "/.idea/vcs.xml",
		"/.vscode/settings.json", "/.vscode/launch.json",
		"/composer.json", "/bower.json", "/component.json",
	}
	return makePaths(p, "Info", "medium")
}

func logPaths() []pathEntry {
	p := []string{
		"/error_log", "/error.log", "/errors.log",
		"/access.log", "/access_log",
		"/debug.log", "/app.log", "/application.log",
		"/npm-debug.log", "/yarn-error.log", "/yarn-debug.log",
		"/laravel.log", "/storage/logs/laravel.log",
		"/var/log/apache2/error.log", "/var/log/nginx/error.log",
		"/log/error.log", "/log/access.log", "/log/debug.log",
		"/logs/error.log", "/logs/access.log", "/logs/debug.log",
		"/logs/app.log", "/logs/application.log",
		"/tmp/logs/error.log", "/tmp/debug.log",
		"/server.log", "/catalina.out",
		"/log.txt", "/log.log", "/debug.txt",
		"/php_errors.log", "/php-errors.log",
		"/mysql-error.log", "/postgres.log", "/mongod.log",
		"/crash.log", "/exception.log", "/fatal.log",
		"/audit.log", "/security.log", "/auth.log",
		"/mail.log", "/cron.log", "/syslog",
		"/wp-content/debug.log",
		"/storage/logs/", "/var/log/",
	}
	return makePaths(p, "Logs", "high")
}

func backupPaths() []pathEntry {
	p := []string{
		"/backup/", "/backups/", "/bak/", "/old/", "/temp/", "/tmp/",
		"/save/", "/copy/", "/archive/", "/archived/",
		"/backup.tar", "/backup.tar.gz", "/backup.tar.bz2",
		"/backup.zip", "/backup.rar", "/backup.7z",
		"/site-backup.zip", "/full-backup.zip",
		"/1.zip", "/1.tar.gz", "/2.zip",
		"/test.zip", "/test.tar.gz",
		"/www-backup.zip", "/web-backup.zip",
		"/src.zip", "/source.zip", "/code.zip",
		"/dist.zip", "/release.zip", "/deploy.zip",
		"/upload.zip", "/uploads.zip",
		"/files.zip", "/documents.zip",
		"/images.zip", "/media.zip",
		"/2024.zip", "/2025.zip", "/2026.zip",
		"/jan.zip", "/feb.zip", "/mar.zip",
		"/index.php.bak", "/index.html.bak",
		"/index.php~", "/index.php.old", "/index.php.save",
		"/home.php.bak", "/login.php.bak",
		"/config.php.bak", "/db.php.bak",
		"/.backup", "/.bak", "/.old",
		"/~backup/", "/~old/", "/~tmp/",
	}
	return makePaths(p, "Backup", "high")
}

func cmsPaths() []pathEntry {
	p := []string{
		"/wp-content/uploads/", "/wp-content/plugins/",
		"/wp-content/themes/", "/wp-includes/",
		"/wp-json/", "/wp-json/wp/v2/users",
		"/xmlrpc.php", "/wp-cron.php",
		"/wp-content/debug.log",
		"/wp-config.php.bak", "/wp-config.txt",
		"/feed/", "/comments/feed/",
		"/joomla/", "/administrator/manifests/",
		"/drupal/", "/core/install.php",
		"/sites/default/settings.php",
		"/user/register", "/user/password",
		"/magento/", "/downloader/", "/app/etc/local.xml",
		"/skin/", "/media/", "/var/export/",
		"/shopify/", "/cart.json",
		"/laravel/", "/storage/framework/sessions/",
		"/storage/framework/cache/",
		"/storage/app/", "/bootstrap/cache/",
		"/artisan", "/telescope/",
		"/nova/", "/horizon/", "/horizon/api/",
		"/rails/", "/rails/info", "/rails/mailers",
		"/.rails/credentials",
		"/spring/", "/spring-boot/", "/spring-boot-admin/",
		"/struts/", "/struts2-showcase/",
		"/django/admin/", "/djadmin/",
	}
	return makePaths(p, "CMS", "high")
}

func configPaths() []pathEntry {
	p := []string{
		"/conf/", "/config/", "/configs/", "/configuration/",
		"/etc/passwd", "/etc/shadow", "/etc/hosts",
		"/proc/self/environ", "/proc/self/cmdline",
		"/conf/server.xml", "/conf/tomcat-users.xml",
		"/conf/context.xml", "/conf/logging.properties",
		"/nginx.conf", "/httpd.conf", "/apache2.conf",
		"/my.cnf", "/my.ini", "/php.ini",
		"/uwsgi.ini", "/gunicorn.conf.py",
		"/supervisord.conf", "/supervisor.conf",
		"/redis.conf", "/mongod.conf", "/elasticsearch.yml",
		"/kibana.yml", "/logstash.yml", "/filebeat.yml",
		"/prometheus.yml", "/alertmanager.yml", "/grafana.ini",
		"/haproxy.cfg", "/varnish.vcl",
		"/Caddyfile", "/traefik.yml", "/traefik.toml",
		"/consul.json", "/vault.json", "/vault.hcl",
		"/etcd.conf", "/etcd.yml",
		"/fluentd.conf", "/td-agent.conf",
		"/newrelic.yml", "/newrelic.ini", "/newrelic.js",
		"/datadog.yaml", "/datadog.conf",
		"/sentry.properties", "/.sentryclirc",
		"/rollbar.json", "/bugsnag.json",
		"/crowdin.yml", "/codeship-services.yml",
	}
	return makePaths(p, "Config", "high")
}

func cloudPaths() []pathEntry {
	p := []string{
		"/.aws/credentials", "/.aws/config",
		"/.boto", "/.s3cfg",
		"/aws-credentials.json", "/aws-config.json",
		"/gcloud/credentials", "/gcloud-service-key.json",
		"/service-account.json", "/service_account.json",
		"/google-credentials.json", "/google-services.json",
		"/.azure/credentials", "/azure-credentials.json",
		"/.digitalocean/config", "/digitalocean.json",
		"/heroku-credentials", "/.heroku/credentials",
		"/cloudflare.json", "/.cloudflare/credentials",
		"/firebase-adminsdk.json", "/firebase-config.json",
		"/firestore-debug.log",
		"/.env.vault", "/doppler.yaml",
		"/pulumi.yaml", "/pulumi.dev.yaml", "/pulumi.prod.yaml",
		"/fly.toml", "/render.yaml",
		"/railway.json", "/railway.toml",
		"/supabase/config.toml", "/.supabase/",
		"/planetscale/", "/.planetscale/",
		"/twilio.json", "/sendgrid.env",
		"/stripe-config.json", "/stripe.json",
		"/slack-token.txt", "/discord-token.txt",
		"/github-token.txt", "/.github-token",
		"/gitlab-token.txt", "/.gitlab-token",
	}
	return makePaths(p, "Cloud", "critical")
}

func makePaths(paths []string, category, severity string) []pathEntry {
	entries := make([]pathEntry, len(paths))
	for i, p := range paths {
		entries[i] = pathEntry{Path: p, Category: category, Severity: severity}
	}
	return entries
}
