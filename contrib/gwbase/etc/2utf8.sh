#!/bin/sh
# $Id: 2utf8.sh,v 1.1 2005-02-04 01:38:18 ddr Exp $

sed -e 's/\$/\\\$/g' -e 's/"/\\"/g' $1 | awk "
BEGIN { f=\"\" }
/^]/ { f=\"\" }
/^af/ { f=\"iso-8859-1\" }
/^bg/ { f=\"windows-1251\" }
/^br/ { f=\"iso-8859-1\" }
/^ca/ { f=\"iso-8859-1\" }
/^cs/ { f=\"iso-8859-2\" }
/^da/ { f=\"iso-8859-1\" }
/^de/ { f=\"iso-8859-1\" }
/^en/ { f=\"iso-8859-1\" }
/^eo/ { f=\"iso-8859-1\" }
/^es/ { f=\"iso-8859-1\" }
/^et/ { f=\"iso-8859-15\" }
/^fi/ { f=\"iso-8859-1\" }
/^fr/ { f=\"iso-8859-1\" }
/^he/ { f=\"iso-8859-8\" }
/^is/ { f=\"iso-8859-1\" }
/^it/ { f=\"iso-8859-1\" }
/^lv/ { f=\"iso-8859-1\" }
/^nl/ { f=\"iso-8859-1\" }
/^no/ { f=\"iso-8859-1\" }
/^pl/ { f=\"iso-8859-2\" }
/^pt/ { f=\"iso-8859-1\" }
/^ro/ { f=\"iso-8859-2\" }
/^ru/ { f=\"windows-1251\" }
/^sl/ { f=\"iso-8859-2\" }
/^sv/ { f=\"iso-8859-1\" }
/^zh/ { f=\"gb2312\" }
f != \"\" { system(\"echo \\\"\" \$0 \"\\\" | iconv -f \" f \" -t utf-8\") }
f == \"\" { system(\"echo \\\"\" \$0 \"\\\"\") }
"