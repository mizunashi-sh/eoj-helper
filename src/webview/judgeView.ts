export function getJudgeView(body: string) {
    return `<html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.css">
                    <script src="https://cdn.staticfile.org/jquery/2.1.1/jquery.min.js"></script>
                </head>
                <body>${body}<script src="https://cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.js"></script>
                <script>
                    STATUS = {};
                    STATUS[-4] = 'Submitted';
                    STATUS[-3] = 'In queue';
                    STATUS[-2] = 'Running';
                    STATUS[-1] = 'Wrong answer';
                    STATUS[0] = 'Accepted';
                    STATUS[1] = 'Time limit exceeded';
                    STATUS[2] = 'Idleness limit exceeded';
                    STATUS[3] = 'Memory limit exceeded';
                    STATUS[4] = 'Runtime error';
                    STATUS[5] = 'Denial of judgement';
                    STATUS[6] = 'Compilation error';
                    STATUS[7] = 'Partial score';
                    STATUS[8] = 'Time limit exceeded';
                    STATUS[10] = 'Rejected';
                    STATUS[11] = 'Checker error';
                    STATUS[12] = 'Pretest passed';

                    STATUS_COLOR = {};
                    STATUS_COLOR[-233] = '';
                    STATUS_COLOR[-4] = 'black';
                    STATUS_COLOR[-3] = 'blue';
                    STATUS_COLOR[-2] = 'blue';
                    STATUS_COLOR[-1] = 'red';
                    STATUS_COLOR[0] = 'green';
                    STATUS_COLOR[1] = 'orange';
                    STATUS_COLOR[2] = 'orange';
                    STATUS_COLOR[3] = 'orange';
                    STATUS_COLOR[4] = 'yellow';
                    STATUS_COLOR[5] = 'violet';
                    STATUS_COLOR[6] = 'grey';
                    STATUS_COLOR[7] = 'black';
                    STATUS_COLOR[8] = 'orange';
                    STATUS_COLOR[10] = 'red';
                    STATUS_COLOR[11] = 'orange';
                    STATUS_COLOR[12] = 'green';

                    STATUS_ICON = {};
                    STATUS_ICON[-233] = '';
                    STATUS_ICON[-4] = 'help';
                    STATUS_ICON[-3] = 'help';
                    STATUS_ICON[-2] = 'help';
                    STATUS_ICON[-1] = 'remove';
                    STATUS_ICON[0] = 'check';
                    STATUS_ICON[1] = 'remove';
                    STATUS_ICON[2] = 'remove';
                    STATUS_ICON[3] = 'remove';
                    STATUS_ICON[4] = 'remove';
                    STATUS_ICON[5] = 'remove';
                    STATUS_ICON[6] = 'warning';
                    STATUS_ICON[7] = 'check';
                    STATUS_ICON[8] = 'remove';
                    STATUS_ICON[10] = 'remove';
                    STATUS_ICON[11] = 'remove';
                    STATUS_ICON[12] = 'check';
                $("h5.ui.header.status-span, .status-label").each(function () {
                    var status = parseInt($(this).data('status'));
                    var icon = '<i class="icon circle fitted ' + STATUS_ICON[status] + '"></i>';
                    if ($(this).hasClass("with-icon")) {
                      if ($(this).data("sp") || status == 7)
                        $(this).html(icon + STATUS[status] + ": " + \$(this).data('score'));
                      else $(this).html(icon + STATUS[status]);
                    } else {
                      if ($(this).data("sp") || status == 7)
                        $(this).html(STATUS[status] + ": " + \$(this).data('score'));
                      else if ($(this).data('test'))
                        $(this).html(STATUS[status] + " on test " + \$(this).data('test'));
                      else $(this).html(STATUS[status]);
                    }
                    $(this).addClass(STATUS_COLOR[status]);
                    if (status != 0) {
                      $(this).css("font-weight", 600);
                    }
                  });
                  $("span.status-icon").each(function () {
                    var status = parseInt($(this).data('status'));
                    var icon = $(this).find('i.icon');
                    icon.addClass(STATUS_COLOR[status]);
                    icon.addClass(STATUS_ICON[status]);
                  });
                </script>
                </body>
            </html>`;
}